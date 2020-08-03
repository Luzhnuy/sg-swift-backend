import { Injectable } from '@nestjs/common';
import { ErrorResponse, OrderPrices, PreparedOrderData, PrepareOrderData, TrackOrderInfo } from '../data/misc';
import { GeocoderService } from '../../geocoder/services/geocoder.service';
import { PaymentsStripeService } from '../../payments/services/payments-stripe.service';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { OrdersService } from '../../orders/services/orders.service';
import { OrderEntity, OrderSource, OrderStatus, OrderType } from '../../orders/entities/order.entity';
import { PlaceDetailsResult } from '@google/maps';
import { MerchantsService } from '../../merchants/services/merchants.service';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { OrderTokenEntity } from '../entities/order-token.entity';
import { SchedulerService } from '../../scheduler/services/scheduler.service';
import { SchedulerTaskEntity } from '../../scheduler/entities/scheduler-task.entity';
import { OrderMetadataEntity } from '../../orders/entities/order-metadata.entity';
import { OrderPrepareRequestData } from '../../orders/data/misc';
import { DriverProfileEntity } from '../../drivers/entities/driver-profile.entity';
import { DriversService } from '../../drivers/services/drivers.service';
import { SettingsService } from '../../settings/services/settings.service';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { OrdersEmailSenderService } from '../../orders/services/orders-email-sender.service';

export class ValidationResult {
  googlePlace: PlaceDetailsResult;
  scheduledTime: number;
  timeOffset: number;

  constructor(data?: Partial<ValidationResult>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

enum ApiOrdersScheduledTasksKeys {
  RemoveDeprecated = 'API-V1:remove_deprecated',
}

@Injectable()
export class ApiOrdersService {

  constructor(
    @InjectRepository(OrderTokenEntity) private readonly repository: Repository<OrderTokenEntity>,
    private geocoderService: GeocoderService,
    private paymentsStripeService: PaymentsStripeService,
    private ordersService: OrdersService,
    private merchantsService: MerchantsService,
    private schedulerService: SchedulerService,
    private driversService: DriversService,
    private settingsService: SettingsService,
    private emailSenderService: OrdersEmailSenderService,
  ) {
    this.initScheduler();
  }

  async createOrder(token: OrderTokenEntity, user: UserEntity) {
    const preparedData: {
      info: PrepareOrderData;
      prices: OrderPrepareRequestData;
    } = JSON.parse(token.data);
    const merchant = await this.merchantsService
      .getMerchantByUserId(user.id);
    const orderMetadata = new OrderMetadataEntity({
      distance: preparedData.prices.distance,
      description: preparedData.info.instructions,
      pickUpLat: (preparedData.prices.origin as { lat: number, lon: number }).lat,
      pickUpLon: (preparedData.prices.origin as { lat: number, lon: number }).lon,
      pickUpTitle: merchant.name,
      pickUpAddress: merchant.departments[0].address,
      pickUpPhone: merchant.phone,
      pickUpEmail: merchant.email,
      dropOffLat: (preparedData.prices.destination as { lat: number, lon: number }).lat,
      dropOffLon: (preparedData.prices.destination as { lat: number, lon: number }).lon,
      dropOffTitle: preparedData.info.customerName,
      dropOffAddress: preparedData.info.dropOffAddress,
      dropOffPhone: preparedData.info.customerPhone,
      largeOrder: preparedData.prices.largeOrder,
      bringBack: preparedData.prices.bringBack,
      utcOffset: preparedData.info.utcOffset,
    });
    const order = new OrderEntity({
      metadata: orderMetadata,
      source: preparedData.prices.source,
      type: preparedData.prices.type,
      scheduledAt: new Date(preparedData.info.scheduledAt),
    });
    order.merchant = merchant;
    order.merchantId = merchant.id;
    let bookedOrderData;
    try {
      bookedOrderData = await this.ordersService
        .bookOrder(order, preparedData.prices);
    } catch (e) {
      console.log('Error 201', e);
      return {
        code: 201,
        message: 'Merchant’s Payment Card is declined.',
      };
    }
    const newOrder = await this.ordersService
      .saveOrder(bookedOrderData);
    await this.repository
      .remove(token);
    return this.getOrderData(newOrder);
  }

  async getTrackingData(orderId: number, user: UserEntity): Promise<ErrorResponse | TrackOrderInfo> {
    const order = await this.checkIfOwnOrder(orderId, user);
    if (order === false) {
      return {
        code: 203,
        message: 'Order not found.',
      };
    } else {
      return this.getOrderData(order as OrderEntity);
    }
  }

  async cancelOrder(orderId: number, reason: string, user: UserEntity): Promise<ErrorResponse | TrackOrderInfo> {
    let order = await this.checkIfOwnOrder(orderId, user);
    if (order === false) {
      return {
        code: 203,
        message: 'Order not found.',
      };
    } else {
      order = (order as OrderEntity);
      if (order.status === OrderStatus.Cancelled) {
        return {
          code: 204,
          message: 'Order is already cancelled.',
        };
      } else if (order.status !== OrderStatus.Received) {
        return {
          code: 205,
          message: 'Order cannot be cancelled.',
        };
      }
      try {
        if (order.type === OrderType.Menu) {
          await this.ordersService
            .assignSubOptionsToItems(order);
        }
        await this.emailSenderService
          .sendCancelOrderEmail(order);
      } catch (e) {
        console.log(e);
      }
      const scheduledDate = new Date(order.scheduledAt);
      const nowDate = new Date();
      const timeDiff = Math.round((scheduledDate.getTime() - nowDate.getTime()) / 1000);
      const refundCancellationFee = timeDiff < 1800;
      await this.ordersService.updateOrderStatus(order, OrderStatus.Cancelled,
        undefined, undefined, undefined,
        reason, false, refundCancellationFee);
      return this.getOrderData(order);
    }
  }

  async checkTokenExists(token: string): Promise<ErrorResponse | OrderTokenEntity> {
    const tokenEntity = await this.repository
      .findOne({ token });
    if (tokenEntity) {
      return tokenEntity;
    } else {
      return {
        code: 202,
        message: 'Token does not exist or deprecated.',
      };
    }
  }

  async validate(data: PrepareOrderData, user: UserEntity): Promise<ErrorResponse | ValidationResult> {
    try {
      this.validateInformationFields(
        data.customerName,
        data.customerPhone,
        data.instructions,
      );
      const scheduledAt = new Date(data.scheduledAt);
      await this.validatePaymentMethod(user);
      const googlePlace = await this.validateAddress(data.dropOffAddress);
      const timeOffset = googlePlace.utc_offset || (googlePlace as any).utc_offset_minutes;
      const scheduledTime = Math.floor(this.validateTime(scheduledAt, timeOffset) / 60);
      return new ValidationResult({ googlePlace, scheduledTime, timeOffset });
    } catch (error) {
      return error as ErrorResponse;
    }
  }

  async prepareOrder(data: PrepareOrderData, validationResult: ValidationResult, user: UserEntity) {
    data = Object.assign({
      largeOrder: false,
      bringBack: false,
      type: OrderType.Booking,
      source: OrderSource.Api,
    }, data);
    const merchant = await this.merchantsService
      .getMerchantByUserId(user.id);
    const prepareRequest: any = {
      type: data.type,
      source: data.source,
      largeOrder: data.largeOrder,
      bringBack: data.bringBack,
      scheduledTime: validationResult.scheduledTime, // minutes
      destination: {
        lat: validationResult.googlePlace.geometry.location.lat,
        lon: validationResult.googlePlace.geometry.location.lng,
      },
      origin: {
        lat: merchant.departments[0].latitude,
        lon: merchant.departments[0].longitude,
      },
    };
    const prepareResponse = await this.ordersService
      .prepareOrder(prepareRequest);
    data.utcOffset = validationResult.timeOffset;
    const jsonData = {
      info: data,
      prices: prepareResponse,
    }
    const jsonDataStr = JSON.stringify(jsonData);
    const orderPrices: OrderPrices = {
      baseFare: this.toFixed(prepareResponse.extras.baseFare),
      distanceFare: this.toFixed(prepareResponse.extras.distanceFare),
      largeOrderFare: this.toFixed(prepareResponse.extras.largeOrderFare),
      tvq: this.toFixed(prepareResponse.tvq),
      tps: this.toFixed(prepareResponse.tps),
      totalAmount: this.toFixed(prepareResponse.totalAmount),
      deliveryCharge: this.toFixed(prepareResponse.deliveryCharge),
      serviceFee: this.toFixed(prepareResponse.serviceFee),
      surgeTime: prepareResponse.extras.surgeTime,
      distance: prepareResponse.distance,
    };
    const orderTokenEntity = await this.repository
      .save({
        data: jsonDataStr,
      });
    const result: PreparedOrderData = {
      token: orderTokenEntity.token,
      prices: orderPrices,
    };
    return result;
  }

  private async getOrderData(order: OrderEntity | number): Promise<TrackOrderInfo> {
    if (!(order instanceof OrderEntity)) {
      order = await this.ordersService
        .getById(order);
    }
    const driver: DriverProfileEntity = await this.driversService
      .getSingle(order.driverProfileId);
    const trackBaseUrl = this.settingsService
      .getValue(SettingsVariablesKeys.TrackOrderWeb);
    const result: TrackOrderInfo = {
      id: order.id.toString(),
      trackingLink: `${trackBaseUrl}${order.uuid}`,
      customerName: order.metadata.dropOffTitle,
      deliveryAddress: order.metadata.dropOffAddress,
      customerPhone: order.metadata.dropOffPhone,
      instructions: order.metadata.description || order.metadata.deliveryInstructions,
      scheduledTime: order.scheduledAt,
      deliveryStage: order.status,
      driverName: driver ? `${driver.firstName} ${driver.lastName}` : null,
    };
    return result;
  }

  private async validateAddress(addressStr: string): Promise<PlaceDetailsResult> {
    addressStr = addressStr || '';
    addressStr = addressStr.trim();
    if (addressStr.length < 5) {
      throw {
        code: 105,
        message: 'Invalid address. Must be a Google Maps recognized address.',
      };
    }
    const googlePlace = await this.geocoderService
      .getAddress(addressStr);
    if (googlePlace) {
      const shortZipcode = this.geocoderService.getShortZipcode(googlePlace);
      const zoneAvailable = await this.geocoderService
        .checkMerchantsZipcodePresents(shortZipcode);
      if (!zoneAvailable) {
        throw {
          code: 101,
          message: 'User is not in serviced zone.',
        };
      }
      return googlePlace;
    } else {
      throw {
        code: 105,
        message: 'Invalid address. Must be a Google Maps recognized address.',
      };
    }
  }

  private validateTime(scheduledAt: Date | string, timezoneOffset: number) {
    if (typeof scheduledAt === 'string') {
      scheduledAt = new Date(scheduledAt);
    }
    if (!scheduledAt || isNaN(scheduledAt.getDate())) {
      throw {
        code: 104,
        message: 'User selected time windows that is not accepted by SnapGrab.',
      };
    }
    const maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);
    maxDate.setDate(maxDate.getDate() + 8);
    if (scheduledAt.getTime() > maxDate.getTime()) {
      throw {
        code: 102,
        message: 'Scheduled date should be less than 7 days in the future.',
      };
    }
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 1);
    if (scheduledAt.getTime() < minDate.getTime()) {
      throw {
        code: 103,
        message: 'Scheduled date should be more than 1 hour in the future.',
      };
    }
    const hoursOffset = Math.floor(timezoneOffset / 60);
    const minutesOffset = timezoneOffset % 60;
    const scheduledHours = scheduledAt.getHours() + hoursOffset;
    const scheduledMinutes = scheduledAt.getMinutes() + minutesOffset;
    const scheduledSeconds = scheduledAt.getSeconds();
    const scheduledTime = (scheduledHours * 3600) + (scheduledMinutes * 60) + scheduledSeconds;
    const minTime = 36000; // 10 * 60 * 60
    const maxTime = 79200; // 22 * 60 * 60
    if (scheduledTime < minTime || scheduledTime > maxTime) {
      throw {
        code: 104,
        message: 'User selected time window that is not accepted by SnapGrab.',
      };
    }
    return scheduledTime;
  }

  private async validatePaymentMethod(user: UserEntity) {
    const card = await this.paymentsStripeService
      .getCardByUser(user);
    if (!card) {
      throw {
        code: 109,
        message: 'User does not have a valid payment method on file.',
      };
    }
  }

  private validateInformationFields(name: string, phone: string, instructions: string) {
    this.validateName(name);
    this.validatePhone(phone);
    this.validateInstructions(instructions);
  }

  private validateName(name: string) {
    name = name || '';
    name = name.trim();
    if (name.length < 2 || name.length > 64) {
      throw {
        code: 106,
        message: 'Missing Information fields. Customer name should be more than 1 and less than 65 characters.',
      };
    }
    return true;
  }

  private validatePhone(phone: string) {
    phone = phone || '';
    phone = phone.trim();
    if (!/^\+?\d{10,12}$/.test(phone)) {
      throw {
        code: 107,
        message: 'Missing Information fields. Invalid phone number.',
      };
    }
    return true;
  }

  private validateInstructions(instructions: string) {
    instructions = instructions || '';
    instructions = instructions.trim();
    if (instructions.length < 1) {
      throw {
        code: 108,
        message: 'Missing Information fields. Invalid apt number.',
      };
    }
    return true;
  }

  private async checkIfOwnOrder(orderId: number, user: UserEntity): Promise<boolean | OrderEntity> {
    const merchant = await this.merchantsService
      .getMerchantByUserId(user.id);
    const order = await this.ordersService
      .getById(orderId);
    return (order && order.merchantId === merchant.id) ? order : false;
  }

  private async initScheduler() {
    const scheduledAt = new Date();
    const interval = 60; // 1 minute
    scheduledAt.setTime(scheduledAt.getTime());
    let task;
    const tasks = await this.schedulerService
      .getTasksByKey(ApiOrdersScheduledTasksKeys.RemoveDeprecated);
    if (!tasks || tasks.length === 0) {
      task = new SchedulerTaskEntity({
        key: ApiOrdersScheduledTasksKeys.RemoveDeprecated,
        interval,
        data: '',
        scheduledAt,
      });
    } else {
      task = tasks[0];
    }
    try {
      await this.schedulerService.addTask(task);
    } catch (e) {
      console.error(e);
    }
    this.schedulerService
      .getThread(ApiOrdersScheduledTasksKeys.RemoveDeprecated)
      .subscribe(() => {
        const date = new Date();
        // date.setHours(date.getHours() + 3); // for local testing
        date.setMinutes(date.getMinutes() - 30);
        this.repository
          .delete({
            createdAt: LessThan(this.formatDate(date)),
          });
      });
  }

  private formatDate(date: Date) {
    return date.toISOString().
      replace(/T/, ' ').
      replace(/\..+/, '');
  }

  private toFixed(num: number | string) {
    if (typeof num === 'string') {
      num = parseFloat(num);
    }
    num = num || 0;
    return parseFloat(num.toFixed(2));
  }

}
