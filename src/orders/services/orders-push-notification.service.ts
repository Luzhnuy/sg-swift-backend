import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OneSignalService } from 'onesignal-api-client-nest';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { SettingsService } from '../../settings/services/settings.service';

@Injectable()
export class OrdersPushNotificationService {

  private oneSignalServiceCustomer: OneSignalService;
  private oneSignalServiceDriver: OneSignalService;

  constructor(
    private readonly settingsService: SettingsService,
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
      });
  }

  public async sendNotificationToCustomerReferer(user: UserEntity, customerName: string, creditsReceived = 10) {
    await this.sendNotification(
      'Customer',
      `Congratulations! You just received $${creditsReceived} for inviting ${customerName} to SnapGrab. Enjoy!`,
      {
        type: 'ReferralFirstOrder',
      },
      'dev_snapgrab_user_id',
      user.id,
    );
  }

  public async sendNotificationToCustomerCreditReached(user: UserEntity) {
    // await this.sendNotification(
    //   'Customer',
    //   'Congrats! You earned a free delivery by using SnapGrab. Redeem it on your next order.',
    //   {
    //     type: 'CreditReceived',
    //   },
    //   'dev_credit_received',
    //   user.id,
    // );
  }

  public async sendNotificationToCustomers(order: OrderEntity) {
    let message: string;
    switch (order.status) {
      case OrderStatus.Received:
        if (!order.metadata.discount) {
          if (order.customer.metadata.credit >= 5) {
            message = `Congrats!, You now have enough SnapCash for a FREE delivery.
            Redeem it on your next order from our partner merchants in the “Explore” Tab.`;
          } else {
            const credits = (order.customer.metadata.credit || 0).toFixed(2);
            message = `Great! You earned SnapCash. You now have $${ credits }.
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
      'dev_order_status_changed',
      order.customer.userId.toString(),
    );
  }

  public async sendNotificationToDrivers(orderId) {
    await this.sendNotification(
      'Driver',
      'New order available. Take a look.',
      {
        type: 'NewOrder',
        orderId,
      },
      'dev_new_order',
      'new',
    );
  }

  private async sendNotification(
    sendTo: 'Customer' | 'Driver',
    message: string,
    data: {
      type: 'NewOrder' | 'OrderStatusChanged' | 'CreditReceived' | 'ReferralFirstOrder',
      [key: string]: any,
    },
    key: string,
    value: any,
  ) {
    const oneSignalService = sendTo === 'Customer' ? this.oneSignalServiceCustomer : this.oneSignalServiceDriver;
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
