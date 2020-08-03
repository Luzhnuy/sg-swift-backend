import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTokensService } from '../services/api-tokens.service';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ApiOrdersService, ValidationResult } from '../services/api-orders.service';
import { CancelOrderData, CreateOrderData, PrepareOrderData, TrackOrderData } from '../data/misc';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { OrderEntity } from '../../orders/entities/order.entity';
import { UsersService } from '../../cms/users/services/users.service';
import { OrderTokenEntity } from '../entities/order-token.entity';

@Controller('v1')
export class ApiV1Controller {
  constructor(
    private tokensService: ApiTokensService,
    private apiOrdersService: ApiOrdersService,
    private rolesAndPermissions: RolesAndPermissionsService,
    private contentPermissionsHelper: ContentPermissionHelper,
    private usersService: UsersService,
  ) {
  }

  @Post('order/prepare')
  public async calcOrderPrice(
    @Body() data: PrepareOrderData,
  ) {
    const user = await this.checkPermissions(data.key);
    if (!user) {
      throw new UnauthorizedException('You haven\'t permissions to create Order');
    }
    const validationResult = await this.apiOrdersService
      .validate(data, user);
    if (validationResult instanceof ValidationResult) {
      return this.apiOrdersService
        .prepareOrder(data, validationResult, user);
    } else {
      return validationResult;
    }
  }

  @Post('order')
  public async createOrder(
    @Body() data: CreateOrderData,
  ) {
    const user = await this.checkPermissions(data.key);
    if (!user) {
      throw new UnauthorizedException('You haven\'t permissions to create Order');
    }
    const tokenEntity = await this.apiOrdersService
      .checkTokenExists(data.token);
    if (tokenEntity instanceof OrderTokenEntity) {
      return this.apiOrdersService
        .createOrder(tokenEntity, user);
    } else {
      return tokenEntity;
    }
  }

  @Post('order/track')
  public async trackOrder(
    @Body() data: TrackOrderData,
  ) {
    const user = await this.checkPermissions(data.key, ContentPermissionsKeys.ContentViewOwn);
    if (!user) {
      throw new UnauthorizedException('You haven\'t permissions to track Order');
    } else {
      return this.apiOrdersService
        .getTrackingData(parseInt(data.id, 10), user);
    }
  }

  @Post('order/cancel')
  public async cancelOrder(
    @Body() data: CancelOrderData,
  ) {
    const user = await this.checkPermissions(data.key);
    if (!user) {
      throw new UnauthorizedException('You haven\'t permissions to cancel Order');
    } else {
      return this.apiOrdersService
        .cancelOrder(parseInt(data.id, 10), data.reason, user);
    }
  }

  private async checkPermissions(
    token: string,
    permission = ContentPermissionsKeys.ContentAdd,
  ) {
    const tokenEntity = await this.tokensService
      .getUserIdByToken(token);
    if (!tokenEntity) {
      return false;
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
    return permissionGranted ? user : false;
  }
}
