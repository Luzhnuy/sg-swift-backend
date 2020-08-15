import { Injectable } from '@nestjs/common';
import {
  ErrorResponse,
  OrderPrices,
  OrdersListRequestData,
  OrdersListResponseData,
  PreparedOrderData,
  PrepareOrderData,
  TrackOrderInfo,
} from '../data/misc';
import { GeocoderService } from '../../geocoder/services/geocoder.service';
import { PaymentsStripeService } from '../../payments/services/payments-stripe.service';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { OrdersService } from '../../orders/services/orders.service';
import { OrderEntity, OrderSource, OrderStatus, OrderType } from '../../orders/entities/order.entity';
import { PlaceDetailsResult } from '@google/maps';
import { MerchantsService } from '../../merchants/services/merchants.service';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository, In, Between } from 'typeorm';
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
import { TestOrdersService } from '../../orders/services/test-orders.service';
import { TestOrderEntity } from '../../orders/entities/test-order.entity';
import { TestOrderMetadataEntity } from '../../orders/entities/test-order-metadata.entity';

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
    private testOrdersService: TestOrdersService,
    private merchantsService: MerchantsService,
    private schedulerService: SchedulerService,
    private driversService: DriversService,
    private settingsService: SettingsService,
    private emailSenderService: OrdersEmailSenderService,
  ) {
    this.initScheduler();
  }

  async getOrdersList(
    params: Partial<OrdersListRequestData>,
    user: UserEntity,
    production: boolean,
  ): Promise<OrdersListResponseData | ErrorResponse> {
    const defaultParams: Partial<OrdersListRequestData> = {
      Offset: 0,
      Limit: 20,
      SortBy: 'Id',
      OrderBy: 'Desc',
    };
    Object.assign(defaultParams, params);
    params = defaultParams;
    const validationResult = this.validateOrdersListParams(params);
    if (validationResult !== true) {
      return validationResult;
    }
    const order: any = {
      [params.SortBy === 'Id' ? 'id' : 'scheduledAt']: params.OrderBy.toUpperCase(),
    };
    const merchant = await this.merchantsService
      .getMerchantByUserId(user.id);
    const where: any = {
      merchantId: merchant.id,
    };
    if (params.DeliveryStage) {
      const statuses = Array.isArray(params.DeliveryStage) ? params.DeliveryStage : [params.DeliveryStage];
      where.status = In(statuses);
    }
    if (params.OrderType) {
      const types = Array.isArray(params.OrderType) ? params.OrderType : [params.OrderType];
      where.type = In(types);
    }
    if (params.Period) {
      const d1 = new Date(params.Period[0]);
      const d2 = new Date(params.Period[1]);
      where.scheduledAt = Between(this.formatDate(d1), this.formatDate(d2));
    }
    const queryParams = {
      skip: params.Offset,
      take: params.Limit,
      order,
      where,
    };
    const result = await this.getService(production)
      .findOrderForApi(queryParams);
    const orders: TrackOrderInfo[] = [];
    for (const i in result[0]) {
      if (Number.isInteger(parseInt(i, 10))) {
        const trackOrderInfo = await this.getOrderData(result[0][i]);
        orders.push(trackOrderInfo);
      }
    }
    return {
      Count: result[1],
      Orders: orders,
    };
  }

  public validateOrderId(id: string): ErrorResponse | true {
    if (id && /^\d+$/.test(id)) {
      return true;
    } else {
      return {
        Code: 110,
        Message: 'Invalid param \'Id\'',
      };
    }
  }

  async createOrder(token: OrderTokenEntity, user: UserEntity, production: boolean) {
    const preparedData: {
      info: PrepareOrderData;
      prices: OrderPrepareRequestData;
    } = JSON.parse(token.data);
    const merchant = await this.merchantsService
      .getMerchantByUserId(user.id);
    const metadataParams: Partial<OrderMetadataEntity | TestOrderMetadataEntity> = {
      distance: preparedData.prices.distance,
      description: preparedData.info.Instructions,
      pickUpLat: (preparedData.prices.origin as { lat: number, lon: number }).lat,
      pickUpLon: (preparedData.prices.origin as { lat: number, lon: number }).lon,
      pickUpTitle: merchant.name,
      pickUpAddress: merchant.departments[0].address,
      pickUpPhone: merchant.phone,
      pickUpEmail: merchant.email,
      dropOffLat: (preparedData.prices.destination as { lat: number, lon: number }).lat,
      dropOffLon: (preparedData.prices.destination as { lat: number, lon: number }).lon,
      dropOffTitle: preparedData.info.CustomerName,
      dropOffAddress: preparedData.info.DropOffAddress,
      dropOffPhone: preparedData.info.CustomerPhone,
      largeOrder: preparedData.prices.largeOrder,
      bringBack: preparedData.prices.bringBack,
      utcOffset: preparedData.info.utcOffset,
    };
    const orderMetadata: OrderMetadataEntity | TestOrderMetadataEntity =
      production ?
        new OrderMetadataEntity(metadataParams as Partial<OrderMetadataEntity>) :
        new TestOrderMetadataEntity(metadataParams as Partial<TestOrderMetadataEntity>);
    const orderParams: Partial<OrderEntity | TestOrderEntity> = {
      source: preparedData.prices.source,
      type: preparedData.prices.type,
      scheduledAt: new Date(preparedData.info.ScheduledAt),
    };
    const order: OrderEntity | TestOrderEntity = production ?
      new OrderEntity(orderParams as Partial<OrderEntity>) :
      new TestOrderEntity(orderParams as Partial<TestOrderEntity>);
    order.metadata = orderMetadata;
    order.merchant = merchant;
    order.merchantId = merchant.id;
    let bookedOrderData;
    try {
      // bookedOrderData = await this.ordersService
      //   .bookOrder(order, preparedData.prices);
      bookedOrderData = await this.getService(production)
        .bookOrder(order as any, preparedData.prices);
    } catch (e) {
      return {
        code: 201,
        message: 'Merchant’s payment card is declined.',
      };
    }
    // const newOrder = await this.ordersService
    const newOrder = await this.getService(production)
      .saveOrder(bookedOrderData);
    await this.repository
      .remove(token);
    return this.getOrderData(newOrder);
  }

  async getTrackingData(orderId: number, user: UserEntity, production: boolean): Promise<ErrorResponse | TrackOrderInfo> {
    const order = await this.checkIfOwnOrder(orderId, user, production);
    if (order === false) {
      return {
        Code: 203,
        Message: 'Order not found.',
      };
    } else {
      return this.getOrderData(order as OrderEntity);
    }
  }

  async cancelOrder(
    orderId: number,
    reason: string,
    user: UserEntity,
    production: boolean,
  ): Promise<ErrorResponse | TrackOrderInfo> {
    let order = await this.checkIfOwnOrder(orderId, user, production);
    if (order === false) {
      return {
        Code: 203,
        Message: 'Order not found.',
      };
    } else {
      order = (order as OrderEntity);
      if (order.status === OrderStatus.Cancelled) {
        return {
          Code: 204,
          Message: 'Order is already cancelled.',
        };
      } else if (order.status !== OrderStatus.Received) {
        return {
          Code: 205,
          Message: 'Order cannot be cancelled.',
        };
      }
      try {
        if (order.type === OrderType.Menu) {
          await this.ordersService
            .assignSubOptionsToItems(order);
        }
        if (production) {
          await this.emailSenderService
            .sendCancelOrderEmail(order);
        }
      } catch (e) {
        console.log(e);
      }
      const scheduledDate = new Date(order.scheduledAt);
      const nowDate = new Date();
      const timeDiff = Math.round((scheduledDate.getTime() - nowDate.getTime()) / 1000);
      const refundCancellationFee = timeDiff < 1800;
      // await this.ordersService.updateOrderStatus(
      await this.getService(production)
        .updateOrderStatus(
          order as any,
          OrderStatus.Cancelled,
          undefined, undefined, undefined,
          reason, false, refundCancellationFee,
        );
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
        Code: 202,
        Message: 'Token does not exist or deprecated',
      };
    }
  }

  async validate(data: PrepareOrderData, user: UserEntity): Promise<ErrorResponse | ValidationResult> {
    try {
      this.validateInformationFields(
        data.CustomerName,
        data.CustomerPhone,
        data.Instructions,
      );
      const scheduledAt = new Date(data.ScheduledAt);
      await this.validatePaymentMethod(user);
      const googlePlace = await this.validateAddress(data.DropOffAddress);
      const timeOffset = googlePlace.utc_offset || (googlePlace as any).utc_offset_minutes;
      const scheduledTime = Math.floor(this.validateTime(scheduledAt, timeOffset) / 60);
      return new ValidationResult({ googlePlace, scheduledTime, timeOffset });
    } catch (error) {
      return error as ErrorResponse;
    }
  }

  async prepareOrder(data: PrepareOrderData, validationResult: ValidationResult, user: UserEntity) {
    data = Object.assign({
      LargeOrder: false,
      BringBack: false,
      Type: OrderType.Booking,
      Source: OrderSource.Api,
    }, data);
    const merchant = await this.merchantsService
      .getMerchantByUserId(user.id);
    const prepareRequest: any = {
      type: data.Type,
      source: data.Source,
      largeOrder: data.LargeOrder,
      bringBack: data.BringBack,
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
    };
    const jsonDataStr = JSON.stringify(jsonData);
    const orderPrices: OrderPrices = {
      BaseFare: this.toFixed(prepareResponse.extras.baseFare),
      DistanceFare: this.toFixed(prepareResponse.extras.distanceFare),
      LargeOrderFare: this.toFixed(prepareResponse.extras.largeOrderFare),
      tvq: this.toFixed(prepareResponse.tvq),
      tps: this.toFixed(prepareResponse.tps),
      TotalAmount: this.toFixed(prepareResponse.totalAmount),
      DeliveryCharge: this.toFixed(prepareResponse.deliveryCharge),
      ServiceFee: this.toFixed(prepareResponse.serviceFee),
      SurgeTime: prepareResponse.extras.surgeTime,
      Distance: prepareResponse.distance,
    };
    const orderTokenEntity = await this.repository
      .save({
        data: jsonDataStr,
      });
    const result: PreparedOrderData = {
      Token: orderTokenEntity.token,
      Prices: orderPrices,
    };
    return result;
  }

  private getService(production: boolean): OrdersService | TestOrdersService {
    return production ? this.ordersService : this.testOrdersService;
  }

  private async getOrderData(order: OrderEntity | TestOrderEntity | number): Promise<TrackOrderInfo> {
    if (!(order instanceof OrderEntity) && !(order instanceof TestOrderEntity)) {
      order = await this.ordersService
        .getById(order);
    }
    let driver: DriverProfileEntity;
    if (order.driverProfileId) {
      driver = await this.driversService
        .getSingle(order.driverProfileId);
    }
    const trackBaseUrl = this.settingsService
      .getValue(SettingsVariablesKeys.TrackOrderWeb);
    const result: TrackOrderInfo = {
      Id: order.id.toString(),
      TrackingLink: `${trackBaseUrl}${order.uuid}`,
      CustomerName: order.metadata.dropOffTitle,
      DeliveryAddress: order.metadata.dropOffAddress,
      CustomerPhone: order.metadata.dropOffPhone,
      Instructions: order.metadata.description || order.metadata.deliveryInstructions,
      ScheduledTime: order.scheduledAt,
      DeliveryStage: order.status,
      DriverName: driver ? `${driver.firstName} ${driver.lastName}` : null,
    };
    return result;
  }

  private async validateAddress(addressStr: string): Promise<PlaceDetailsResult> {
    addressStr = addressStr || '';
    addressStr = addressStr.trim();
    if (addressStr.length < 5) {
      throw {
        Code: 105,
        Message: 'Invalid address. Must be a Google Maps recognized address.',
      };
    }
    const googlePlace = await this.geocoderService
      .getAddress(addressStr);
    if (googlePlace) {
      console.log('googlePlace :: ', googlePlace);
      const shortZipcode = this.geocoderService.getShortZipcode(googlePlace);
      const zoneAvailable = await this.geocoderService
        .checkMerchantsZipcodePresents(shortZipcode);
      if (!zoneAvailable) {
        throw {
          Code: 101,
          Message: 'User is not in serviced zone.',
        };
      }
      return googlePlace;
    } else {
      throw {
        Code: 105,
        Message: 'Invalid address. Must be a Google Maps recognized address.',
      };
    }
  }

  private validateTime(scheduledAt: Date | string, timezoneOffset: number) {
    if (typeof scheduledAt === 'string') {
      scheduledAt = new Date(scheduledAt);
    }
    if (!scheduledAt || isNaN(scheduledAt.getDate())) {
      throw {
        Code: 104,
        Message: 'User selected time windows that is not accepted by SnapGrab.',
      };
    }
    const maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);
    maxDate.setDate(maxDate.getDate() + 8);
    if (scheduledAt.getTime() > maxDate.getTime()) {
      throw {
        Code: 102,
        Message: 'Scheduled date should be less than 7 days in the future.',
      };
    }
    const minDate = new Date();
    minDate.setMinutes(minDate.getMinutes() + 5);
    if (scheduledAt.getTime() < minDate.getTime()) {
      throw {
        Code: 103,
        Message: 'Scheduled date should be more than 5 minutes in the future.',
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
        Code: 104,
        Message: 'User selected time windows that is not accepted by SnapGrab.',
      };
    }
    return scheduledTime;
  }

  private async validatePaymentMethod(user: UserEntity) {
    const card = await this.paymentsStripeService
      .getCardByUser(user);
    if (!card) {
      throw {
        Code: 109,
        Message: 'User does not have a valid payment method on file.',
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
        Code: 106,
        Message: 'Missing Information fields. Customer name should be more than 1 and less than 65 characters.',
      };
    }
    return true;
  }

  private validatePhone(phone: string) {
    phone = phone || '';
    phone = phone.trim();
    if (!/^\+?\d{10,12}$/.test(phone)) {
      throw {
        Code: 107,
        Message: 'Missing Information fields. Invalid phone number.',
      };
    }
    return true;
  }

  private validateInstructions(instructions: string) {
    instructions = instructions || '';
    instructions = instructions.trim();
    if (instructions.length > 64) {
      throw {
        Code: 108,
        Message: 'Missing Information fields. Invalid apt number.',
      };
    }
    return true;
  }

  private validateOrdersListParams(params: Partial<OrdersListRequestData>) {
    if (params.DeliveryStage) {
      const valid = this.validateDeliveryStatus(params.DeliveryStage);
      if (!valid) {
        return {
          Code: 110,
          Message: 'Invalid param \'DeliveryStage\'.',
        };
      }
    }
    if (params.OrderType) {
      const valid = this.validateOrderType(params.OrderType);
      if (!valid) {
        return {
          Code: 110,
          Message: 'Invalid param \'OrderType\'.',
        };
      }
    }
    if (params.Limit) {
      const valid = this.validateLimit(params.Limit);
      if (!valid) {
        return {
          Code: 110,
          Message: 'Invalid param \'Limit\' (Max 20).',
        };
      }
    }
    if (params.Offset) {
      const valid = this.validateNumber(params.Offset);
      if (!valid) {
        return {
          Code: 110,
          Message: 'Invalid param \'Offset\'.',
        };
      }
    }
    if (params.OrderBy) {
      const valid = this.validateOrderBy(params.OrderBy);
      if (!valid) {
        return {
          Code: 110,
          Message: 'Invalid param \'OrderBy\'.',
        };
      }
    }
    if (params.SortBy) {
      const valid = this.validateSortBy(params.SortBy);
      if (!valid) {
        return {
          Code: 110,
          Message: 'Invalid param \'SortBy\'.',
        };
      }
    }
    if (params.Period) {
      const valid = this.validateScheduledPeriod(params.Period);
      if (!valid) {
        return {
          Code: 110,
          Message: 'Invalid param \'Period\'.',
        };
      }
    }
    return true;
  }

  private validateLimit(limit: number | string) {
    const isNumber = this.validateNumber(limit);
    if (isNumber) {
      limit = parseInt(limit.toString(), 10);
      return limit <= 20;
    }
    return false;
  }

  private validateNumber(val: number | string) {
    if (val) {
      return /^\d+$/.test(val.toString());
    }
    return true;
  }

  private validateDeliveryStatus(statuses: OrderStatus | OrderStatus[]) {
    statuses = Array.isArray(statuses) ? statuses : [statuses];
    return !statuses.find(status => [
      OrderStatus.Received,
      OrderStatus.Cancelled,
      OrderStatus.Accepted,
      OrderStatus.OnWay,
      OrderStatus.Completed,
    ].indexOf(status) === -1);
  }

  private validateOrderType(types: OrderType | OrderType[]) {
    types = Array.isArray(types) ? types : [types];
    return !types.find(type => [
      OrderType.Booking,
      OrderType.Menu,
      OrderType.Custom,
      OrderType.Trip,
    ].indexOf(type) === -1);
  }

  private validateScheduledPeriod(period: Date[] | string[]) {
    if (Array.isArray(period) && period.length === 2) {
      try {
        const d1 = new Date(period[0].toString());
        const d2 = new Date(period[1].toString());
        return !!(d1 && d2);
      } catch (e) {
        return false;
      }
    } else {
      return false;
    }
  }

  private validateSortBy(sortBy: 'Id' | 'ScheduledAt') {
    return ['Id', 'ScheduledAt'].indexOf(sortBy) > -1;
  }

  private validateOrderBy(orderBy: 'Asc' | 'Desc') {
    return ['Asc', 'Desc'].indexOf(orderBy) > -1;
  }

  private async checkIfOwnOrder(orderId: number, user: UserEntity, production: boolean): Promise<boolean | TestOrderEntity | OrderEntity> {
    const merchant = await this.merchantsService
      .getMerchantByUserId(user.id);
    // const order = await this.ordersService
    const order = await this.getService(production)
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
