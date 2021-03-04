import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  HttpService,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import {
  ContentPermissionHelper,
  ContentPermissionsKeys,
} from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { OrderEntity, OrderSource, OrderStatus, OrderType } from '../entities/order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ContentEntityParam } from '../../cms/content/decorators/content-entity-param.decorator';
import { PermissionsGuard } from '../../cms/roles-and-permissions/guards/permissions.guard';
import { PermissionKeys } from '../providers/orders-config';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { OrdersService } from '../services/orders.service';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { OrderDeliveredToEntity } from '../entities/order-delivered-to.entity';
import { GetswiftDelivery } from '../data/getswift-delivery';
import { OrderItemEntity } from '../entities/order-item.entity';
import * as fs from 'fs';
import { OrderMetadataEntity, PaymentMethods } from '../entities/order-metadata.entity';
import { HistoryOrder } from '../data/history-order';
import { DriversService } from '../../drivers/services/drivers.service';
import { DriverProfileEntity } from '../../drivers/entities/driver-profile.entity';
import { SettingsService } from '../../settings/services/settings.service';
import { MerchantsService } from '../../merchants/services/merchants.service';
import { UsersService } from '../../cms/users/services/users.service';
import { CustomersService } from '../../customers/services/customers.service';
import { PromoCodesService } from '../../promo-codes/promo-codes.service';
import { OrdersPushNotificationService } from '../services/orders-push-notification.service';
import { OrdersEmailSenderService } from '../services/orders-email-sender.service';
import { OrdersOldService } from '../services/orders-old.service';
import { OrderPrepareRequestData } from '../data/misc';
import { OrdersReportsService } from '../services/orders-reports.service';
import { SchedulerService } from '../../scheduler/services/scheduler.service';
import { OrdersScheduledTasksKeys } from '../data/scheduled-tasks-keys';
import { PaymentsStripeService } from '../../payments/services/payments-stripe.service';
import { timer } from 'rxjs';
import { MenuSubOptionEntity } from '../../merchants/entities/menu-sub-option.entity';
import { Response } from 'express';
import { MerchantsRolesName } from '../../merchants/services/merchants-config.service';
import { TestOrderEntity } from '../entities/test-order.entity';
import { PaymentsPayPalService } from '../../payments/services/payments-pay-pal.service';

interface SearchQuery {
  customerId?: string | number;
  statuses?: OrderStatus[];
  range?: Date[] | string;
  query?: string;
  order: 'desc' | 'asc' | 'DESC' | 'ASC';
  orderBy: string;
  limit?: number;
  page?: number;
  types?: OrderType[] | string | string[];
  token?: string; // for one-time-token
  timezoneOffset?: string;
  rated?: string;
}

@Controller('orders')
@CrudEntity(OrderEntity)
export class OrdersController extends CrudController {

  constructor(
    @InjectRepository(OrderEntity) protected readonly repository: Repository<OrderEntity>,
    @InjectRepository(TestOrderEntity) protected readonly repositoryTestOrders: Repository<TestOrderEntity>,
    @InjectRepository(OrderMetadataEntity) protected readonly repositoryMetadata: Repository<OrderMetadataEntity>,
    @InjectRepository(OrderItemEntity) protected readonly repositoryOrdersItems: Repository<OrderItemEntity>,
    @InjectRepository(MenuSubOptionEntity) protected readonly repositorySubOptions: Repository<MenuSubOptionEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    private ordersService: OrdersService,
    private oldService: OrdersOldService,
    private driversService: DriversService,
    private readonly httpService: HttpService,
    private settingsService: SettingsService,
    private merchantsService: MerchantsService,
    private customersService: CustomersService,
    private usersService: UsersService,
    private promoCodesService: PromoCodesService,
    private pushNotificationService: OrdersPushNotificationService,
    private emailSenderService: OrdersEmailSenderService,
    private reportsService: OrdersReportsService,
    private schedulerService: SchedulerService,
    private paymentsStripeService: PaymentsStripeService,
    private paymentsPayPalService: PaymentsPayPalService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('test-push')
  async testPushEvent() {
    const order = await this.repository.findOne({
      order: { id: 'DESC' },
    });
    return this.pushNotificationService
      .sendNotificationToCustomers(order);
      // .sendNotificationToDrivers(order.id);
  }

  @Get('test-charge-id/:id')
  async testChargeId(
    @Param('id') id: string,
  ) {
    const charge = await this.paymentsStripeService
      .checkCharge(id);
    return charge;
  }

  @Get('')
  async loadContentEntities(@User() user: UserEntity, @Query() query: SearchQuery) {
    query.limit = query.limit || 100;
    const builder = await this.getQueryBuilder(user, query);
    return builder.getMany();
  }

  @Get('dashboard')
  async loadDashboardContentEntities(@User() user: UserEntity, @Query() query: SearchQuery) {
    delete query.limit;
    delete query.page;
    const limit = 100;
    const builder = await this.getQueryBuilder(user, query, false, true);
    builder.leftJoinAndSelect('entity.metadata', 'metadata');
    const totalCount = await builder.getCount();
    const pagesCount = Math.ceil(totalCount / limit);
    return this.getAllByStep([], builder, pagesCount, limit);
  }

  @Get('get-anonymous-order/:uuid')
  async loadOrderForAnonymous(@User() user: UserEntity, @Param('uuid') uuid: string) {
    let order: OrderEntity | TestOrderEntity = await this.repository.findOne({ uuid });
    if (!order) {
      order = await this.repositoryTestOrders.findOne({ uuid });
      if (!order) {
        throw new NotFoundException('Order not found');
      }
    }
    return {
      id: order.id,
      uuid: order.uuid,
      type: order.type,
      status: order.status,
      createdAt: order.createdAt,
      metadata: {
        description: order.metadata.description,
        dropOffAddress: order.metadata.dropOffAddress,
        pickUpAddress: order.metadata.pickUpAddress,
        pickUpLat: order.metadata.pickUpLat,
        pickUpLon: order.metadata.pickUpLon,
        dropOffLat: order.metadata.dropOffLat,
        dropOffLon: order.metadata.dropOffLon,
        pickUpTitle: order.metadata.pickUpTitle,
        deliveryCharge: order.metadata.deliveryCharge,
        serviceFee: order.metadata.serviceFee,
        subtotal: order.metadata.subtotal,
        tps: order.metadata.tps,
        tvq: order.metadata.tvq,
        tip: order.metadata.tip,
        totalAmount: order.metadata.totalAmount,
        customAmount: order.metadata.customAmount,
        chargedAmount: order.metadata.chargedAmount,
        discount: order.metadata.discount,
        chargeId: order.metadata.chargeId,
      },
      orderItems: (order as OrderEntity).orderItems ? (order as OrderEntity).orderItems.map(item => ({
          description: item.description,
          price: item.price,
          quantity: item.quantity,
          sku: item.sku,
        }),
      ) : [],
      driverProfile: (order as OrderEntity).driverProfile ? {
        firstName: (order as OrderEntity).driverProfile.firstName,
        lastName: (order as OrderEntity).driverProfile.lastName,
        phone: (order as OrderEntity).driverProfile.phone,
        type: (order as OrderEntity).driverProfile.type,
        status: {
          latitude: (order as OrderEntity).driverProfile.status.latitude,
          longitude: (order as OrderEntity).driverProfile.status.longitude,
        },
      } : null,
    };
  }

  @Get('make-charge/:orderId')
  async makeBookingCharge(@User() user: UserEntity, @Param('orderId') orderId: number) {
    const order = await this.repository.findOne({ id: orderId });
    await this.ordersService.bookOrder(order);
    return this.repository.save(order);
  }

  @Post(':id/extra-tip')
  @UseGuards(ContentEntityNotFoundGuard)
  async createExtraTip(
    @ContentEntityParam() order: OrderEntity,
    @User() user: UserEntity,
    @Body() body: { extraTip: number; extraTipPercent: number, paymentMethod: PaymentMethods, extraTipChargeId: string },
  ) {
    if (body.extraTipPercent) {
      const extraTipPercent = body.extraTipPercent / 100;
      order.metadata.tip = order.metadata.totalAmount * extraTipPercent;
      order.metadata.tipPercent = extraTipPercent;
    } else if (body.extraTip) {
      order.metadata.tip = parseFloat(body.extraTip.toString());
    }
    if (order.metadata.tip) {
      if (body.paymentMethod === PaymentMethods.Stripe) {
        const amount = Math.round(order.metadata.tip * 100);
        const card = await this.paymentsStripeService
          .getCardByUser(user);
        if (!card) {
          throw new UnprocessableEntityException('Payment card not found');
        }
        const res = await this.ordersService
          .payExtraTipStripe(order, amount, card);
        order.metadata.tipChargedAmount = amount;
        order.metadata.tipChargeId = res.id;
      } else if (body.paymentMethod === PaymentMethods.ApplePay
        || body.paymentMethod === PaymentMethods.PayPal) {
        order.metadata.tipChargeId = body.extraTipChargeId;
      } else {
        throw new UnprocessableEntityException('Cannot charge tip');
      }
      order.metadata.totalAmount += order.metadata.tip;
      await this.repositoryMetadata.save(order.metadata);
      return { success: true };
    }
    return { success: false };
  }

  @Post(':id/rate')
  @UseGuards(PermissionsGuard(() => PermissionKeys.AllowRateOwnOrder))
  @UseGuards(ContentEntityNotFoundGuard)
  async rateOrder(
    @ContentEntityParam() order: OrderEntity,
    @User() user: UserEntity,
    @Body() body: { rate: number; feedback: string },
  ) {
    if (order.customer.userId !== user.id) {
      throw new UnauthorizedException('You cannot rate this order');
    }
    const rate = body.rate ? parseInt(body.rate.toString(), 10) : null;
    if (rate !== null && (isNaN(rate) || rate < 1 || rate > 5)) {
      throw new UnprocessableEntityException('Rate can be 1..5');
    }
    order.metadata.rate = rate;
    const feedback = body.feedback ? body.feedback.toString().substr(0, 512) : null;
    order.metadata.feedback = feedback;
    order.metadata.rated = true;
    await this.repositoryMetadata.save(order.metadata);
    return { success: true };
  }

  @Post('')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  async createContentEntity(@Body() entity: OrderEntity, @User() user: UserEntity) {
    switch (entity.type) {
      case OrderType.Booking:
      case OrderType.Trip:
        await this.setMerchantToOrder(entity, user);
        break;
      case OrderType.Custom:
        await this.setCustomerToOrder(entity, user);
        break;
      case OrderType.Menu:
        await this.setMerchantToOrder(entity, user);
        await this.setCustomerToOrder(entity, user);
        break;
    }
    if (entity.type === OrderType.Menu && entity.orderItems && entity.orderItems.length) {
      await this.ordersService.assignSubOptionsToItems(entity);
      await this.ordersService.assignMenuToItems(entity);
      this.ordersService.calcOrderItemsPrices(entity);
    }
    entity = await this.ordersService.bookOrder(entity);
    const customerPhoto = entity.metadata.customerPhoto;
    entity.metadata.customerPhoto = null;
    const order = await super.createContentEntity(entity, user) as OrderEntity;
    if (order.type === OrderType.Menu && entity.orderItems && entity.orderItems.length) {
      const orderItems = entity.orderItems.map(oi => {
        oi.orderId = order.id;
        return oi;
      });
      await this.repositoryOrdersItems.save(orderItems);
      await this.ordersService
        .decrementInventory(order);
    }
    if (customerPhoto) {
      const path = this.saveCustomerPhoto(customerPhoto, order.id);
      order.metadata.customerPhoto = path;
      await this.repositoryMetadata.save(order.metadata);
    }
    if (order.source === OrderSource.Customer) {
      if (order.metadata.promoCode) {
        const deleted = await this.promoCodesService.removeByCode(order.metadata.promoCode);
      } else {
        if (order.metadata.discount) {
          const discount = parseFloat(order.metadata.discount.toString());
          order.customer.metadata.credit += discount;
          await this.customersService.saveMetadata(order.customer.metadata);
        } else {
          order.customer.metadata.credit += .5;
          await this.customersService.saveMetadata(order.customer.metadata);
        }
      }
      if (order.customer.metadata.refUserId && !order.customer.metadata.refPaid) {
        const refererCustomer = await this.customersService.get({
          userId: order.customer.metadata.refUserId,
        });
        if (refererCustomer) {
          refererCustomer.metadata.credit += 10;
          order.customer.metadata.refPaid = true;
          await this.customersService.saveMetadata(refererCustomer.metadata);
          await this.customersService.saveMetadata(order.customer.metadata);
          this.pushNotificationService.sendNotificationToCustomerReferer(
            refererCustomer.user,
            `${order.customer.firstName} ${order.customer.lastName}`,
          );
        }
      }
    }
    try {
      switch (order.type) {
        case OrderType.Booking:
        case OrderType.Trip:
        case OrderType.Menu:
          await this.emailSenderService
            .sendConfirmationEmail(order);
          break;
        case OrderType.Custom:
          await this.emailSenderService
            .sendReceiptCustomer(order);
          break;
      }
    } catch (e) {
      console.log(e);
    }

    this.ordersService.emitOrderUpdate({
      eventName: 'created',
      updateData: order,
    });
    return order;
  }

  @Post('trip')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  async createContentEntityTrip(@Body() entities: OrderEntity[], @User() user: UserEntity) {
    const ts = Math.round((new Date()).getTime() / 10000000) // about 2.8 of hour
      .toString();
    const randPart = Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, '')
      .substr(0, 10 - ts.length);
    const tripUuid = ts + randPart;
    // tslint:disable-next-line:forin
    for (const i in entities) {
      const entity = entities[i];
      entity.metadata.tripUuid = tripUuid;
      await this.setMerchantToOrder(entity, user);
    }
    entities = await this.ordersService.bookTripOrders(entities);
    const orders: OrderEntity[] = [];
    // tslint:disable-next-line:forin
    for (const i in entities) {
      const entity = entities[i];
      const order = await super.createContentEntity(entity, user) as OrderEntity;
      orders.push(order);
      this.ordersService.emitOrderUpdate({
        eventName: 'created',
        updateData: order,
      });
    }
    this.emailSenderService
      .sendConfirmationEmail(orders);
    return orders;
  }

  private async setMerchantToOrder(entity, user) {
    const merchantWhere: any = {};
    if (entity.source === OrderSource.Merchant) {
      merchantWhere.userId = user.id;
    // } else if (entity.source === OrderSource.Manual) {
    } else {
      // TODO check ADDITIONAL permission
      merchantWhere.id = entity.merchantId;
    }
    const merchant = await this.merchantsService.get(merchantWhere);
    if (!merchant) {
      throw new UnauthorizedException('You cannot create "Booking" orders');
    }
    if ([OrderType.Booking, OrderType.Trip ].indexOf(entity.type) > -1 && !merchant.enableBooking) {
      throw new UnprocessableEntityException('Your Bookings service is disabled. Contact SnapGrab for more information.');
    } else if (entity.type === OrderType.Menu && !merchant.enableMenu) {
      throw new UnprocessableEntityException('Menu service is disabled. Contact SnapGrab for more information.');
    }
    entity.merchant = merchant;
    entity.merchantId = merchant.id;
  }

  private async setCustomerToOrder(entity, user) {
    const customerWhere: any = {};
    if (entity.source === OrderSource.Customer) {
      customerWhere.userId = user.id;
    } else if (entity.source === OrderSource.Manual) {
      // TODO check ADDITIONAL permission
      customerWhere.id = entity.customerId;
    }
    const customer = await this.customersService.get(customerWhere);
    if (!customer) {
      throw new UnauthorizedException('Customer hasn\'t payment card');
    }
    const debtAmount = await this.ordersService.getCustomerDebt(entity.customerId);
    if (debtAmount) {
      throw new UnprocessableEntityException('User already has debt. Please, pay the Debt!');
    }
    entity.customer = customer;
    entity.customerId = customer.id;
  }

  // TODO check if guards are necessary
  @Put(':id')
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEditOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEdit];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  async updateContentEntity(
    @User() user: UserEntity,
    @ContentEntityParam() currentEntity: ContentEntity,
    @Body() newEntity: ContentEntity,
  ) {
    const order = await super.updateContentEntity(user, currentEntity, newEntity);
    this.ordersService.emitOrderUpdate({
      eventName: 'updated',
      updateData: order,
    });
    return order;
  }

  @Put('status/:id')
  @UseGuards(PermissionsGuard(() => PermissionKeys.AllowChangeOrderStatus))
  @UseGuards(ContentEntityNotFoundGuard)
  // @UseInterceptors
  async updateOrderStatus(
    @User() user: UserEntity,
    @ContentEntityParam() order: OrderEntity,
    @Body()
      {
        status,
        driverProfileId,
        deliveredTo,
        customAmount,
        photo,
        cancellationReason,
        source,
      }: {
        status: OrderStatus,
        driverProfileId?: number,
        deliveredTo?: OrderDeliveredToEntity,
        customAmount?: number,
        photo?: string,
        cancellationReason?: string,
        source?: OrderSource,
      },
  ) {
    switch (status) {
      case OrderStatus.Accepted:
        if (order.status === OrderStatus.Received) { // Previous status
          const driver: DriverProfileEntity = await this.driversService.getSingle(driverProfileId);
          if (driver.maxSimultaneousDelivery) {
            const activeOrderCount = await this.ordersService.countActiveOrderByDriverId(driverProfileId);
            if (driver.maxSimultaneousDelivery <= activeOrderCount) {
              throw new UnprocessableEntityException('Error. Max simultaneous deliveries reached.');
            }
          }
          return await this.ordersService.updateOrderStatus(order, status, driverProfileId);
        } else {
          throw new ConflictException('Order is no longer available.');
        }
        break;
      case OrderStatus.OnWay:
        if (photo) {
          const jpegStartStr = 'data:image/jpeg;base64,';
          const pngStartStr = 'data:image/png;base64,';
          const isJpeg = photo.startsWith(jpegStartStr);
          const isPng = photo.startsWith(pngStartStr);
          const path = 'uploads/custom-order/driver';
          let fileName = 'order-' + order.id;
          if ( isJpeg ) {
            fileName += '.jpg';
          } else if ( isPng ) {
            fileName += '.png';
          } else {
            throw new UnprocessableEntityException('Image format is wrong');
          }
          const data = isJpeg ? photo.replace(jpegStartStr, '') : photo.replace(pngStartStr, '');
          try {
            fs.readdirSync(path);
          } catch (e) {
            fs.mkdirSync(path, { recursive: true });
          }
          const filePath = `${path}/${fileName}`;
          fs.writeFileSync(filePath, data, 'base64');
          order.metadata.driverPhoto = `/${filePath}`;
        }
        return await this.ordersService.updateOrderStatus(
          order,
          status,
          undefined,
          undefined,
          customAmount);
        break;
      case OrderStatus.Completed:
        if (deliveredTo) {
          deliveredTo.author = user;
          deliveredTo.moderator = user;
        }
        try {
          let retOrder = await this.ordersService
            .updateOrderStatus(order, status, driverProfileId, deliveredTo);
          retOrder = await this.repository.findOne(retOrder.id);
          try {
            switch (retOrder.type) {
              case OrderType.Booking:
              case OrderType.Trip:
                await this.sendReceiptBookingTrip(retOrder);
                break;
              case OrderType.Custom:
              case OrderType.Menu:
                await this.emailSenderService.sendReceiptCustomer(retOrder);
                break;
            }
          } catch (e) {
            // tslint:disable-next-line:no-console
            console.log(e);
          }
          return retOrder;
        } catch (e) {
          throw new UnprocessableEntityException(e.toString());
        }
        break;
      case OrderStatus.Cancelled:
        try {
          if (order.type === OrderType.Menu) {
            const subOptionsIds = order.orderItems
              .reduce((res: number[], oi) => {
                if (oi.subOptionIds && oi.subOptionIds.length) {
                  return [ ...res, ...oi.subOptionIds];
                }
                return res;
              }, []);
            if (subOptionsIds.length) {
              const subOptions = await this.repositorySubOptions
                .find({
                  where: {
                    id: In(subOptionsIds),
                  },
                });
              order.orderItems
                .forEach(oi => {
                  if (oi.subOptionIds) {
                    oi.subOptions = oi.subOptionIds
                      .map(soId => subOptions.find(so => so.id === soId));
                  }
                });
            }
          }
          await this.emailSenderService
            .sendCancelOrderEmail(order);
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.log(e);
        }
        let refundCancellationFee = false;
        if ([OrderType.Menu, OrderType.Custom].indexOf(order.type) !== -1) {
          refundCancellationFee = order.customer ? order.customer.userId === user.id : false;
        } else {
          const scheduledDate = new Date(order.scheduledAt);
          const nowDate = new Date();
          const timeDiff = Math.round((scheduledDate.getTime() - nowDate.getTime()) / 1000);
          refundCancellationFee = timeDiff < 1800;
        }
        return await this.ordersService.updateOrderStatus(order, status,
          undefined, undefined, undefined,
          cancellationReason, false,
          refundCancellationFee);
        break;
      default:
        this.ordersService.updateOrderStatus(order, status, driverProfileId);
        break;
    }
  }

  @Post(':id/arrive')
  @UseGuards(PermissionsGuard(() => PermissionKeys.AllowChangeOrderStatus))
  @UseGuards(ContentEntityNotFoundGuard)
  async updateArrivalAt(
    @User() user: UserEntity,
    @ContentEntityParam() order: OrderEntity,
  ) {
    order.arrivalAt = new Date();
    return this.ordersService
      .saveOrder(order);
  }

  @Get('customer/:customerId/debt')
  async getCustomerDebt(
    @User() user: UserEntity,
    @Param('customerId') customerId: string,
  ) {
    const debtAmount = await this.ordersService
      .getCustomerDebt(
        parseInt(customerId, 10),
      );
    return { debtAmount };
  }

  @Get('pay-debt')
  async payDebt(
    @User() user: UserEntity,
  ) {
    await this.ordersService
      .payUserDebt(user.id);
    return { success: true };
  }

  @Get(':id/debt')
  @UseGuards(ContentEntityNotFoundGuard)
  async getOrderDebt(
    @User() user: UserEntity,
    @Param('id') orderId: string,
  ) {
    const tasks = await this.schedulerService
      .getTasksByKey(OrdersScheduledTasksKeys.ChargeDebt);
    return tasks.find(task => task.data === orderId) || {};
  }

  @Post(':id/debt')
  @UseGuards(ContentEntityNotFoundGuard)
  async payOrderDebt(
    @User() user: UserEntity,
    @ContentEntityParam() order: OrderEntity,
    @Param('id') orderId: string,
  ) {
    const tasks = await this.schedulerService
      .getTasksByKey(OrdersScheduledTasksKeys.ChargeDebt);
    for (const task of tasks) {
      if (task.data === orderId) {
        await this.schedulerService.runTask(task);
        await timer(10000)
          .toPromise();
        const newTask = await this.schedulerService
          .getById(task.id);
        if (newTask) {
          throw new UnprocessableEntityException('Debt wasn\'t charged');
        } else {
          return { success: true };
        }
      }
    }
    // if task wasn't found try to pay debt without task
    if (!order.customer) {
      throw new NotFoundException('Customer not found');
    }
    const card = await this.paymentsStripeService
      .getCardByUser(order.customer.userId);
    if (!card) {
      throw new UnprocessableEntityException('No credit card found');
    }
    await this.ordersService.payOrderDebt(order, card);
    return { success: true };
  }

  @Delete(':id/debt')
  // TODO important GUARD
  @UseGuards(ContentEntityNotFoundGuard)
  async clearOrderDebt(
    @User() user: UserEntity,
    @Param('id') orderId: string,
    @ContentEntityParam() order: OrderEntity,
  ) {
    order.metadata.debtAmount = null;
    await this.repository.save(order);
    const tasks = await this.schedulerService
      .getTasksByKey(OrdersScheduledTasksKeys.ChargeDebt);
    for (const task of tasks) {
      if (task.data === orderId) {
        return await this.schedulerService.removeTask(task);
      }
    }
    return { success: true };
  }

  ////////////////////
  // OLD Functionality
  ////////////////////

  @Post('book-delivery')
  async delivery(
    @Body() data: GetswiftDelivery,
    @User() user: UserEntity,
  ) {
    let order: OrderEntity;
    if (data.booking.items) {
      order = await this.oldService.convertMenuDataToOrder(data);
    } else if (data.booking.deliveryInstructions.toString().startsWith('CUSTOM_ORDER')) {
      order = await this.oldService.convertCustomDataToOrder(data);
    } else if (data.extra) {
      switch (data.extra.type) {
        case OrderType.Menu:
          order = await this.oldService.convertMenuDataToOrder(data);
          break;
        case OrderType.Custom:
          order = await this.oldService.convertCustomDataToOrder(data);
          break;
        case OrderType.Booking:
        case OrderType.Trip:
        default:
          order = await this.oldService.convertBookingDataToOrder(data);
          break;
      }
    } else if (data.booking.parentOrder) {
      order = await this.oldService.convertBookingDataToOrder(data);
    }
    order = await super.createContentEntity(order, user) as OrderEntity;
    if (order.type === OrderType.Menu) {
      const items = await this.repositoryOrdersItems.save(
        order.orderItems.map(item => {
          item.orderId = order.id;
          return item;
        }),
      );
      order.orderItems = items;
    }
    this.ordersService.emitOrderUpdate({
      eventName: 'created',
      updateData: order,
    });
    return this.oldService.convertOrderToGetSwiftResult(order);
  }

  @Post('update-delivery')
  async updateDelivery(
    @Body() data: HistoryOrder,
    @User() user: UserEntity,
  ) {
    const order: OrderEntity = await this.repository.findOne({ uuid: data.jobid });
    if (data.chargeid) {
      order.metadata.chargeId = data.chargeid;
    }
    if (data.last4) {
      order.metadata.lastFour = data.last4;
    }
    if (data.userid) {
      order.metadata.clientId = data.userid;
      const customer = await this.customersService
        .get({ clientId: order.metadata.clientId } );
      if (customer) {
        order.customerId = customer.id;
        await this.repository.save({
          id: order.id,
          customerId: order.customerId,
        });
      }
    }
    if (data.paymentmethod) {
      order.metadata.paymentMethod = data.paymentmethod as any;
    }
    if (data.servicefee) {
      order.metadata.serviceFee = data.servicefee;
    }
    if (data.photo) {
      const jpegStartStr = 'data:image/jpeg;base64,';
      const pngStartStr = 'data:image/png;base64,';
      const isJpeg = data.photo.startsWith(jpegStartStr);
      const isPng = data.photo.startsWith(pngStartStr);
      const path = 'uploads/custom-order/user';
      let fileName = 'order-' + order.id;
      if ( isJpeg ) {
        fileName += '.jpg';
      } else if ( isPng ) {
        fileName += '.png';
      } else {
        throw new UnprocessableEntityException('Image format is wrong');
      }
      const photoData = isJpeg ? data.photo.replace(jpegStartStr, '') : data.photo.replace(pngStartStr, '');
      try {
        fs.readdirSync(path);
      } catch (e) {
        fs.mkdirSync(path, { recursive: true });
      }
      const filePath = `${path}/${fileName}`;
      fs.writeFileSync(filePath, photoData, 'base64');
      order.metadata.customerPhoto = `/${filePath}`;
    }

    if (data.type) {
      switch (data.type) {
        case 'menu - Merchant':
          this.oldService.calcMenuPricesFromHistoryData(data, order);
          break;
        case 'custom':
          this.oldService.calcCustomPricesFromHistoryData(data, order);
          break;
      }
    }
    order.metadata = await this.repositoryMetadata.save(order.metadata);
    this.ordersService.emitOrderUpdate({
      eventName: 'updated',
      updateData: order,
    });
    return order;
  }

  @Put(':id/update-location/')
  // @UseInterceptors
  @UseGuards(ContentPermissionsGuard(
  isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEditOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEdit];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  async updateOrderLocation(
    @ContentEntityParam() order: OrderEntity,
    @Body()
      data:
      {
        pickUpLat: number,
        pickUpLon: number,
        dropOffLat: number,
        dropOffLon: number,
        distance: number,
      },
  ) {
    return await this.repositoryMetadata.save({
      id: order.metadata.id,
      ...data,
    });
  }

  @Get('count')
  // TODO add permissions
  async countOrders(@User() user: UserEntity, @Query() query: SearchQuery) {
    const builder = await this.getQueryBuilder(user, query);
    return builder.getCount();
  }

  @Get('total')
  // TODO add permissions
  async countOrdersJSON(@User() user: UserEntity, @Query() query: SearchQuery) {
    const builder = await this.getQueryBuilder(user, query);
    const count = await builder.getCount();
    return { count };
  }

  @Get('reports')
  @Header('content-type', 'application/octet-stream')
  @Header('content-disposition', 'attachment; filename="orders-reports.csv"')
  async sendReport(@Query() query: SearchQuery) {
    delete query.timezoneOffset;
    const payload = this.usersService.decodeAuthToken(query.token);
    const user = await this.usersService.getUserOneTimeAuth(payload);
    delete query.token;
    delete query.limit;
    delete query.page;
    const limit = 100;
    const builder = await this.getQueryBuilder(user, query, false, true);
    builder
      .leftJoinAndSelect('entity.merchant', 'merchant')
      .leftJoinAndSelect('entity.metadata', 'metadata')
      .leftJoinAndSelect('entity.driverProfile', 'driverProfile');
    const totalCount = await builder.getCount();
    const pagesCount = Math.ceil(totalCount / limit);
    const orders = await this.getAllByStep([], builder, pagesCount, limit);
    let res;
    if (user.roles.find(role => role.name === MerchantsRolesName.Merchant)) {
      res = this.reportsService.convertOrdersToCSVForMerchants(orders);
    } else {
      res = this.reportsService.convertOrdersToCSV(orders);
    }
    return res;
  }

  @Get('invoice')
  @Header('Content-Type', 'application/pdf')
  @Header('content-disposition', 'attachment; filename="earning-invoice.pdf"')
  async sendInvoice(
    @Query() query: SearchQuery,
    @Res() res: Response,
  ) {
    const [ startDate, endDate ] = (query.range as string).split(',').map(dateStr => new Date(dateStr));
    const payload = this.usersService.decodeAuthToken(query.token);
    const user = await this.usersService.getUserOneTimeAuth(payload);
    delete query.token;
    const timezoneOffset = query.timezoneOffset ? parseInt(query.timezoneOffset, 10) : 0;
    delete query.timezoneOffset;
    (query as any).types = OrderType.Menu;
    const builder = await this.getQueryBuilder(user, query);
    builder.innerJoin('entity.merchant', 'merchant');
    builder.innerJoin('merchant.departments', 'departments');
    builder.select('SUM(metadata.subtotal)', 'subtotal');
    builder.addSelect('SUM(metadata.tps)', 'tps');
    builder.addSelect('SUM(metadata.tvq)', 'tvq');
    builder.addSelect('SUM(metadata.chargedAmount)', 'chargedAmount');
    builder.addSelect('merchant.commission', 'commission');
    builder.addSelect('merchant.name', 'name');
    builder.addSelect('departments.address', 'address');
    builder.groupBy('departments.id');
    builder.andWhere('entity.status = :status', { status: OrderStatus.Completed });
    const rawData = await builder.getRawOne();
    if (rawData) {
      const { name, commission, address, subtotal, tps, tvq, chargedAmount } = rawData;
      const stream: any = await this.reportsService
        .convertToInvoicePdf(
          { name, commission, address, subtotal, tps, tvq, chargedAmount },
          startDate, endDate, timezoneOffset,
        );
      stream.pipe(res);
    } else {
      const merchant = await this.merchantsService
        .getMerchantByUserId(user.id);
      const data = {
        name: merchant.name,
        commission: merchant.commission,
        address: merchant.departments[0].address,
        subtotal: '0',
        tps: '0',
        tvq: '0',
        chargedAmount: '0',
      };
      const stream: any = await this.reportsService
        .convertToInvoicePdf(
          data,
          startDate, endDate, timezoneOffset,
        );
      stream.pipe(res);
    }
  }

  @Get('send-receipt/:id')
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentViewOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentViewAll];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  private async sendReceipt(
    @ContentEntityParam() order: OrderEntity,
  ) {
    try {
      switch (order.type) {
        case OrderType.Booking:
        case OrderType.Trip:
          await this.sendReceiptBookingTrip(order);
          break;
        default:
          await this.emailSenderService
            .sendReceiptCustomer(order);
      }
    } catch (e) {
      console.log(e);
    }
    return;
  }

  @Get('send-receipt-anonymous/:id')
  @UseGuards(ContentEntityNotFoundGuard)
  private async sendReceiptAnonymous(
    @ContentEntityParam() order: OrderEntity,
  ) {
    try {
      switch (order.type) {
        case OrderType.Booking:
        case OrderType.Trip:
          await this.sendReceiptBookingTrip(order);
          break;
        default:
          await this.emailSenderService
            .sendReceiptCustomer(order);
      }
    } catch (e) {
      console.log(e);
    }
    return;
  }

  @Post('cancel-delivery-anonymous')
  private async cancelDeliveryAnonymous(
    @Body() data: { jobId: string, cancellationNotes?: string },
  ) {
    const order = await this.repository.findOne({ uuid: data.jobId });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status === OrderStatus.Cancelled) {
      throw new UnprocessableEntityException('Order has been already cancelled');
    }
    return await this.ordersService.updateOrderStatus(order, OrderStatus.Cancelled,
      undefined, undefined, undefined,
      data.cancellationNotes, true);
  }

  @Post('prepare-order')
  private async prepareDelivery(
    @Body() data: OrderPrepareRequestData,
  ) {
    return this.ordersService.prepareOrder(data);
  }

  private async getAllByStep(
    orders: OrderEntity[],
    builder: SelectQueryBuilder<OrderEntity>,
    pagesCount: number,
    limit = 25,
    currentPage = 0,
  ) {
    if (pagesCount > currentPage) {
      builder.take(limit);
      builder.skip(currentPage * limit);
      const newOrders = await builder.getMany();
      orders = orders.concat(newOrders);
      return await this.getAllByStep(orders, builder, pagesCount, limit, ++currentPage);
    } else {
      return orders;
    }
  }

  protected async getQueryBuilder(user: UserEntity, query: SearchQuery, skipPermission = false, skipJoinTables = false) {
    const localQuery = {
      customerId: query.customerId,
      statuses: query.statuses,
      range: query.range,
      query: query.query,
      types: query.types,
      rated: query.rated === 'true',
    };
    query.customerId = null;
    delete query.customerId;
    query.statuses = null;
    delete query.statuses;
    query.range = null;
    delete query.range;
    query.query = null;
    delete query.query;
    query.types = null;
    delete query.types;
    delete query.rated;
    const builder = await super.getQueryBuilder(user, query, skipPermission);
    if (localQuery.customerId) {
      builder.andWhere('entity.customerId = :customerId', localQuery);
    }
    if (localQuery.statuses) {
      builder.andWhere('entity.status IN (:...statuses)', localQuery);
    }
    if (localQuery.range) {
      if (typeof localQuery.range === 'string') {
        localQuery.range = localQuery.range.split(',').map(dateStr => new Date(dateStr));
      }
      if (localQuery.range.length === 2) {
        builder
          .andWhere(`entity.createdAt BETWEEN :start AND :end`,
            {
              start: localQuery.range[0],
              end: localQuery.range[1],
            });
      }
    }
    if (localQuery.types) {
      if (typeof localQuery.types === 'string') {
        localQuery.types = localQuery.types.split(',');
      }
      builder.andWhere('entity.type IN (:...types)', localQuery);
    }
    if (!skipJoinTables && localQuery.query) {
      localQuery.query = `%${localQuery.query}%`;
      builder
        .andWhere(new Brackets(sqb => {
          // sqb.where('order.uuid LIKE :query', query);
          sqb
            .where('metadata.dropOffTitle LIKE :query', localQuery)
            .orWhere('metadata.dropOffPhone LIKE :query', localQuery)
            .orWhere('metadata.reference LIKE :query', localQuery)
            .orWhere('entity.id LIKE :query', localQuery);
        }));
    }
    if (localQuery.rated) {
      builder.andWhere('metadata.rated = true');
    }
    if (!skipJoinTables) {
      builder
        .leftJoinAndSelect('entity.metadata', 'metadata')
        .leftJoinAndSelect('entity.orderItems', 'orderItems')
        .leftJoinAndSelect('entity.driverProfile', 'driverProfile')
        .leftJoinAndSelect('driverProfile.status', 'driverProfile.status');
    }
    return builder as SelectQueryBuilder<OrderEntity>;
  }

  private saveCustomerPhoto(photo: string, orderId: number) {
      const jpegStartStr = 'data:image/jpeg;base64,';
      const pngStartStr = 'data:image/png;base64,';
      const isJpeg = photo.startsWith(jpegStartStr);
      const isPng = photo.startsWith(pngStartStr);
      const path = 'uploads/custom-order/user';
      let fileName = `order-${orderId}`;
      if ( isJpeg ) {
        fileName += '.jpg';
      } else if ( isPng ) {
        fileName += '.png';
      } else {
        throw new UnprocessableEntityException('Image format is wrong');
      }
      const photoData = isJpeg ? photo.replace(jpegStartStr, '') : photo.replace(pngStartStr, '');
      try {
        fs.readdirSync(path);
      } catch (e) {
        fs.mkdirSync(path, { recursive: true });
      }
      const filePath = `${path}/${fileName}`;
      fs.writeFileSync(filePath, photoData, 'base64');
      return `/${filePath}`;
  }

  private async sendReceiptBookingTrip(order: OrderEntity) {
    if (order.type === OrderType.Trip) {
      const uncompletedCount = await this.repository
        .createQueryBuilder('order')
        .innerJoin('order.metadata', 'metadata')
        .andWhere('metadata.tripUuid = :tripUuid', order.metadata)
        .andWhere(`order.status NOT IN(:...statuses)`, { statuses: [ OrderStatus.Completed, OrderStatus.Cancelled ]})
        .getCount();
      if (uncompletedCount === 0) {
        const orders = await this.repository
          .createQueryBuilder('order')
          .innerJoinAndSelect('order.metadata', 'metadata')
          .innerJoinAndSelect('order.merchant', 'merchant')
          .andWhere('metadata.tripUuid = :tripUuid', order.metadata)
          .andWhere(`order.status = :status`, { status: OrderStatus.Completed })
          .getMany();
        await this.emailSenderService
          .sendReceiptTrip(orders);
      }
    } else {
      await this.emailSenderService
        .sendReceiptBooking(order);
    }
  }
}
