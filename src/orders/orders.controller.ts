import {
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  HttpService,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { CrudController } from '../cms/content/controllers/crud-controller';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { RolesAndPermissionsService } from '../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../cms/roles-and-permissions/misc/content-permission-helper';
import { CrudEntity } from '../cms/content/decorators/crud-controller.decorator';
import { OrderEntity, OrderSource, OrderStatus, OrderType } from './entities/order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../cms/users/decorators/user.decorator';
import { UserEntity } from '../cms/users/entities/user.entity';
import { ContentEntityParam } from '../cms/content/decorators/content-entity-param.decorator';
import { PermissionsGuard } from '../cms/roles-and-permissions/guards/permissions.guard';
import { PermissionKeys } from './providers/orders-config';
import { ContentEntityNotFoundGuard } from '../cms/content/guards/content-entity-not-found.guard';
import { OrdersService } from './services/orders.service';
import { ContentPermissionsGuard } from '../cms/content/guards/content-permissions.guard';
import { ContentEntity } from '../cms/content/entities/content.entity';
import { OrderDeliveredToEntity } from './entities/order-delivered-to.entity';
import { GetswiftDelivery } from './data/getswift-delivery';
import { OrderItemEntity } from './entities/order-item.entity';
import * as fs from 'fs';
import { OrderMetadataEntity } from './entities/order-metadata.entity';
import { HistoryOrder } from './data/history-order';
import { DriversService } from '../drivers/services/drivers.service';
import { DriverProfileEntity } from '../drivers/entities/driver-profile.entity';
import { SendGridService } from '@anchan828/nest-sendgrid';
import { SettingsService } from '../settings/services/settings.service';
import { MerchantsService } from '../merchants/services/merchants.service';
import { UsersService } from '../cms/users/services/users.service';
import { CustomersService } from '../customers/services/customers.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { OrdersPushNotificationService } from './services/orders-push-notification.service';
import { OrdersEmailSenderService } from './services/orders-email-sender.service';
import { OrdersOldService } from './services/orders-old.service';
import { OrderPrepareRequestData } from './data/misc';
import { OrdersReportsService } from './services/orders-reports.service';

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
}

@Controller('orders')
@CrudEntity(OrderEntity)
export class OrdersController extends CrudController {

  constructor(
    @InjectRepository(OrderEntity) protected readonly repository: Repository<OrderEntity>,
    @InjectRepository(OrderMetadataEntity) protected readonly repositoryMetadata: Repository<OrderMetadataEntity>,
    @InjectRepository(OrderItemEntity) protected readonly repositoryOrdersItems: Repository<OrderItemEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    private ordersService: OrdersService,
    private oldService: OrdersOldService,
    private driversService: DriversService,
    private readonly httpService: HttpService,
    private readonly sendGrid: SendGridService,
    private settingsService: SettingsService,
    private merchantsService: MerchantsService,
    private customersService: CustomersService,
    private usersService: UsersService,
    private promoCodesService: PromoCodesService,
    private pushNotificationService: OrdersPushNotificationService,
    private emailSenderService: OrdersEmailSenderService,
    private reportsService: OrdersReportsService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('test-push')
  async testPushEvent() {
    const order = await this.repository.findOne({
      order: { id: 'DESC' },
    });
    this.pushNotificationService
      .sendNotificationToCustomers(order);
    return true;
  }

  @Get('')
  async loadContentEntities(@User() user: UserEntity, @Query() query: SearchQuery) {
    const builder = await this.getQueryBuilder(user, query);
    return builder.getMany();
  }

  @Get('get-anonymous-order/:uuid')
  async loadOrderForAnonymous(@User() user: UserEntity, @Param('uuid') uuid: string) {
    const order = await this.repository.findOne({ uuid });
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
      orderItems: order.orderItems.map(item => ({
          description: item.description,
          price: item.price,
          quantity: item.quantity,
          sku: item.sku,
        }),
      ),
      driverProfile: order.driverProfile ? {
        firstName: order.driverProfile.firstName,
        lastName: order.driverProfile.lastName,
        phone: order.driverProfile.phone,
        type: order.driverProfile.type,
        status: {
          latitude: order.driverProfile.status.latitude,
          longitude: order.driverProfile.status.longitude,
        },
      } : null,
    };
  }

  @Post('')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  async createContentEntity(@Body() entity: OrderEntity, @User() user: UserEntity) {
    switch (entity.type) {
      case OrderType.Booking:
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
          if (order.customer.metadata.credit >= 5) {
            this.pushNotificationService.sendNotificationToCustomerCreditReached(order.customer.user);
          }
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
    switch (order.type) {
      case OrderType.Booking:
        this.emailSenderService
          .sendReceiptBooking(order);
        break;
      default:
        this.emailSenderService
          .sendReceiptCustomer(order);
    }
    this.ordersService.emitOrderUpdate({
      eventName: 'created',
      updateData: order,
    });
    return order;
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
    if (entity.type === OrderType.Booking && !merchant.enableBooking) {
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
    const jpegStartStr = 'data:image/jpeg;base64,';
    const pngStartStr = 'data:image/png;base64,';
    try {
      if (status === OrderStatus.Accepted) {
        if (order.status === OrderStatus.Received) {
          // const driver = this.driversService;
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
      } else if (status === OrderStatus.OnWay) {
        if (photo) {
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
      } else if (status === OrderStatus.Completed) {
        if (deliveredTo) {
          deliveredTo.author = user;
          deliveredTo.moderator = user;
        }
        try {
          let retOrder = await this.ordersService
            .updateOrderStatus(order, status, driverProfileId, deliveredTo);
          retOrder = await this.repository.findOne(retOrder.id);
          if (retOrder.type === OrderType.Custom) {
            this.emailSenderService.sendReceiptCustomer(retOrder);
          }
          return retOrder;
        } catch (e) {
          // TODO cancel order
          throw new UnprocessableEntityException(e.toString());
        }
      } else if (status === OrderStatus.Cancelled) {
        return await this.ordersService.updateOrderStatus(order, status,
          undefined, undefined, undefined,
          // cancellationReason, false, source === OrderSource.Customer);
          cancellationReason, false,
          order.customer ? order.customer.userId === user.id : false);
      } else if (status === OrderStatus.Received) {
        this.ordersService.updateOrderStatus(order, status, driverProfileId);
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  @Get('pay-debt')
  async payDebt(
    @User() user: UserEntity,
  ) {
    await this.ordersService
      .payUserDebt(user.id);
    return { success: true };
  }

  // OLD Functionality
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

  @Get('reports')
  @Header('content-type', 'application/octet-stream')
  @Header('content-disposition', 'attachment; filename="orders-reports.csv"')
  async sendReport(@Query() query: SearchQuery) {
    const payload = this.usersService.decodeAuthToken(query.token);
    const user = await this.usersService.getUserOneTimeAuth(payload);
    delete query.token;
    const builder = await this.getQueryBuilder(user, query);
    const orders = await builder.getMany();
    return this.reportsService.convertOrdersToCSV(orders);
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
    switch (order.type) {
      case OrderType.Booking:
        this.emailSenderService
          .sendReceiptBooking(order);
        break;
      default:
        this.emailSenderService
          .sendReceiptCustomer(order);
    }
  }

  @Get('send-receipt-anonymous/:id')
  @UseGuards(ContentEntityNotFoundGuard)
  private async sendReceiptAnonymous(
    @ContentEntityParam() order: OrderEntity,
  ) {
    switch (order.type) {
      case OrderType.Booking:
        this.emailSenderService
          .sendReceiptBooking(order);
        break;
      default:
        this.emailSenderService
          .sendReceiptCustomer(order);
    }
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

  protected async getQueryBuilder(user: UserEntity, query: SearchQuery, skipPermission = false) {
    const localQuery = {
      customerId: query.customerId,
      statuses: query.statuses,
      range: query.range,
      query: query.query,
      types: query.types,
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
    if (localQuery.query) {
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
    builder
      .leftJoinAndSelect('entity.metadata', 'metadata')
      .leftJoinAndSelect('entity.orderItems', 'orderItems')
      .leftJoinAndSelect('entity.driverProfile', 'driverProfile')
      .leftJoinAndSelect('driverProfile.status', 'driverProfile.status');
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
}
