import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OneSignalService } from 'onesignal-api-client-nest';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { SettingsService } from '../../settings/services/settings.service';
import { SchedulerTaskEntity } from '../../scheduler/entities/scheduler-task.entity';
import { SchedulerService } from '../../scheduler/services/scheduler.service';
import { OrdersScheduledTasksKeys } from '../data/scheduled-tasks-keys';

@Injectable()
export class OrdersPushNotificationService {

  private oneSignalServiceCustomer: OneSignalService;
  private oneSignalServiceDriver: OneSignalService;
  private oneSignalServiceMerchant: OneSignalService;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly schedulerService: SchedulerService,
  ) {
    this.settingsService
      .$inited
      .subscribe(() => {
        this.oneSignalServiceCustomer = new OneSignalService({
          appId: this.settingsService.getValue(SettingsVariablesKeys.OneSignalSnapGrabId),
          restApiKey: this.settingsService.getValue(SettingsVariablesKeys.OneSignalSnapGrabKey),
        });
        this.oneSignalServiceDriver = new OneSignalService({
          appId: this.settingsService.getValue(SettingsVariablesKeys.OneSignalSnapGrabSwiftId),
          restApiKey: this.settingsService.getValue(SettingsVariablesKeys.OneSignalSnapGrabSwiftKey),
        });
        this.oneSignalServiceMerchant = new OneSignalService({
          appId: this.settingsService.getValue(SettingsVariablesKeys.OneSignalSnapGrabMerchantId),
          restApiKey: this.settingsService.getValue(SettingsVariablesKeys.OneSignalSnapGrabMerchantKey),
        });
      });
    this.schedulerService
      .getThread(OrdersScheduledTasksKeys.NotifyDrivers)
      .subscribe(task => {
        const orderId = parseInt(task.data, 10);
        this.sendNotificationToDrivers(orderId);
      });
  }

  public async sendNotificationToCustomerReferer(user: UserEntity, customerName: string, creditsReceived = 10) {
    await this.sendNotification(
      'Customer',
      `Congratulations! You just received $${creditsReceived} for inviting ${customerName} to SnapGrab. Enjoy!`,
      {
        type: 'ReferralFirstOrder',
      },
      this.getEnvironmentRelatedEventName('snapgrab_user_id'),
      user.id,
    );
  }

  public async sendNotificationToMerchant(order: OrderEntity) {
    if (order.merchant) {
      let message: string;
      switch (order.status) {
        case OrderStatus.Received:
          message = `Congrats! You received a new order from ${order.customer.firstName}! Please confirm and fulfill this order.`;
          break;
      }
      await this.sendNotification(
        'Merchant',
        message,
        {
          type: 'OrderStatusChanged',
          orderId: order.id,
        },
        this.getEnvironmentRelatedEventName('sg_merchants_user_id'),
        order.merchant.userId.toString(),
      );
    }
  }

  public async sendNotificationToCustomers(order: OrderEntity) {
    if (order.customer) {
      let message: string;
      switch (order.status) {
        case OrderStatus.Received:
          if (!order.metadata.discount) {
            if (order.customer.metadata.credit >= 5) {
              message = `Congrats!, You now have enough SnapCash for a FREE delivery.
          Redeem it on your next order from our partner merchants in the “Explore” Tab.`;
            } else {
              const credits = (order.customer.metadata.credit || 0).toFixed(2);
              message = `Great! You earned SnapCash. You now have $${credits}.
          Redeem your SnapCash when you reach $5.00 towards FREE delivery.`;
            }
          }
          break;
        case OrderStatus.Accepted:
          message = `${order.driverProfile.firstName} ${order.driverProfile.lastName} is on the job. Track your order in the app.`;
          break;
        case OrderStatus.OnWay:
          message = `${order.driverProfile.firstName} ${order.driverProfile.lastName} `
            + `picked-up your order and is on the way to your drop-off location.`;
          break;
        case OrderStatus.Completed:
          message = 'Thanks for ordering with SnapGrab! Your order is delivered.';
          break;
        case OrderStatus.Cancelled:
          message = 'Your order has been cancelled. Check your order history for more details.';
          break;
      }
      await this.sendNotification(
        'Customer',
        message,
        {
          type: 'OrderStatusChanged',
          orderId: order.id,
          status: order.status,
          // skipMoneyEarned: order.status === OrderStatus.Received && (order.metadata.discount || order.customer.metadata.credit >= 5),
        },
        this.getEnvironmentRelatedEventName('order_status_changed'),
        order.customer.userId.toString(),
      );
    }
  }

  public async sendNotificationToDrivers(orderId) {
    return await this.sendNotification(
      'Driver',
      'New order available. Take a look.',
      {
        type: 'NewOrder',
        orderId,
      },
      this.getEnvironmentRelatedEventName('new_order'),
      'new',
    );
  }

  public async sendDelayedNotificationToDrivers(order: OrderEntity) {
    const scheduledAt = new Date(order.scheduledAt);
    const halfHourMS = 1800000;
    scheduledAt.setTime(scheduledAt.getTime() - halfHourMS);
    const task = new SchedulerTaskEntity({
      key: OrdersScheduledTasksKeys.NotifyDrivers,
      scheduledAt,
      data: order.id.toString(),
    });
    const newTask = await this.schedulerService.addTask(task);
    return newTask;
  }

  private getEnvironmentRelatedEventName(name) {
    const environment = this.settingsService.getValue(SettingsVariablesKeys.Environment);
    if (environment === 'production') {
      return `prod_${name}`;
    }
    return `dev_${name}`;
  }

  private async sendNotification(
    sendTo: 'Customer' | 'Driver' | 'Merchant',
    message: string,
    data: {
      type: 'NewOrder' | 'OrderStatusChanged' | 'CreditReceived' | 'ReferralFirstOrder',
      [key: string]: any,
    },
    key: string,
    value: any,
  ) {
    let oneSignalService;
    switch (sendTo) {
      case 'Customer':
        oneSignalService = this.oneSignalServiceCustomer;
        break;
      case 'Driver':
        oneSignalService = this.oneSignalServiceDriver;
        break;
      case 'Merchant':
        oneSignalService = this.oneSignalServiceMerchant;
        break;
    }
    // const oneSignalService = sendTo === 'Customer' ? this.oneSignalServiceCustomer : this.oneSignalServiceDriver;
    return await oneSignalService
      .createNotification({
        contents: { en: message },
        data,
        filters: [{
          field: 'tag',
          relation: '=',
          key,
          value,
        }],
      });
  }
}
