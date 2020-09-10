import { BadRequestException, Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTokensService } from '../services/api-tokens.service';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ApiOrdersService, ValidationResult } from '../services/api-orders.service';
import { CancelOrderData, CreateOrderData, ErrorResponse, OrdersListRequestData, PrepareOrderData, TrackOrderData } from '../data/misc';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { OrderEntity, OrderStatus } from '../../orders/entities/order.entity';
import { UsersService } from '../../cms/users/services/users.service';
import { OrderTokenEntity } from '../entities/order-token.entity';
import 'reflect-metadata';

@Controller('v1')
export class ApiV1Controller {

  private readonly MetadataProductionModeKey = 'ApiV1ProductionMode';

  constructor(
    private tokensService: ApiTokensService,
    private apiOrdersService: ApiOrdersService,
    private apiTestOrdersService: ApiOrdersService,
    private rolesAndPermissions: RolesAndPermissionsService,
    private contentPermissionsHelper: ContentPermissionHelper,
    private usersService: UsersService,
  ) {
  }

  @Post('orders')
  public async getOrdersList(
    @Body() data: OrdersListRequestData,
  ) {
    const user = await this.checkPermissions(data.Key, ContentPermissionsKeys.ContentViewOwn);
    if (!user) {
      throw new UnauthorizedException('You haven\'t permissions to view orders');
    }
    const productionMode = Reflect.getMetadata(this.MetadataProductionModeKey, user);
    const result = await this.apiOrdersService
      .getOrdersList(data, user, productionMode);
    if ((result as ErrorResponse).Code) {
      throw new BadRequestException(result);
    }
    return result;
  }

  @Post('order/prepare')
  public async calcOrderPrice(
    @Body() data: PrepareOrderData,
  ) {
    const user = await this.checkPermissions(data.Key);
    if (!user) {
      throw new UnauthorizedException('You haven\'t permissions to create order');
    }
    const validationResult = await this.apiOrdersService
      .validate(data, user);
    if (validationResult instanceof ValidationResult) {
      return this.apiOrdersService
        .prepareOrder(data, validationResult, user);
    } else {
      throw new BadRequestException(validationResult);
    }
  }

  @Post('order')
  public async createOrder(
    @Body() data: CreateOrderData,
  ) {
    const user = await this.checkPermissions(data.Key);
    if (!user) {
      throw new UnauthorizedException('You haven\'t permissions to create Order');
    }
    const tokenEntity = await this.apiOrdersService
      .checkTokenExists(data.Token);
    if (tokenEntity instanceof OrderTokenEntity) {
      const productionMode = Reflect.getMetadata(this.MetadataProductionModeKey, user);
      return this.apiOrdersService
        .createOrder(tokenEntity, user, productionMode);
    } else {
      throw new BadRequestException(tokenEntity);
    }
  }

  @Post('order/track')
  public async trackOrder(
    @Body() data: TrackOrderData,
  ) {
    const user = await this.checkPermissions(data.Key, ContentPermissionsKeys.ContentViewOwn);
    if (!user) {
      throw new UnauthorizedException('You haven\'t permissions to track order');
    }
    const valid = this.apiOrdersService
      .validateOrderId(data.Id);
    if (valid === true) {
      const productionMode = Reflect.getMetadata(this.MetadataProductionModeKey, user);
      return this.apiOrdersService
        .getTrackingData(parseInt(data.Id, 10), user, productionMode);
    } else {
      throw new BadRequestException(valid);
    }
  }

  @Post('order/cancel')
  public async cancelOrder(
    @Body() data: CancelOrderData,
  ) {
    const user = await this.checkPermissions(data.Key);
    if (!user) {
      throw new UnauthorizedException('You haven\'t permissions to cancel order');
    }
    const valid = this.apiOrdersService
      .validateOrderId(data.Id);
    if (valid === true) {
      const productionMode = Reflect.getMetadata(this.MetadataProductionModeKey, user);
      return this.apiOrdersService
        .cancelOrder(parseInt(data.Id, 10), data.Reason, user, productionMode);
    } else {
      throw new BadRequestException(valid);
    }
  }

  private async checkPermissions(
    token: string,
    permission = ContentPermissionsKeys.ContentAdd,
  ) {
    let production = true;
    let tokenEntity = await this.tokensService
      .getByToken(token, production);
    if (!tokenEntity) {
      production = false;
      tokenEntity = await this.tokensService
        .getByToken(token, production);
      if (!tokenEntity) {
        return false;
      }
    }
    const user = await this.usersService
      .findById(tokenEntity.userId);
    const permissionName = this.contentPermissionsHelper
      .getKeyByContentName(
        ContentPermissionsKeys[permission],
        OrderEntity.name,
      );
    const permissionEntity = await this.rolesAndPermissions
      .getPermissionByKey(permissionName);
    const permissionGranted = await this.rolesAndPermissions
      .checkPermissionByRoles(permissionEntity, user.roles);
    Reflect.defineMetadata(this.MetadataProductionModeKey, production, user);
    return permissionGranted ? user : false;
  }
}
