import { Body, Controller, Post } from '@nestjs/common';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ApiTokensService } from '../services/api-tokens.service';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ApiOrdersService } from '../services/api-orders.service';
import { PrepareOrderData } from '../data/misc';

@Controller('api-v1')
export class ApiV1Controller {
  constructor(
    private tokensService: ApiTokensService,
    private apiOrdersService: ApiOrdersService,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {
  }

  @Post('order/prepare')
  public async calcOrderPrice(
    @User() user: UserEntity,
    @Body() data: PrepareOrderData,
  ) {
    // TODO check user
    // TODO check role
    const validationResult = this.apiOrdersService
      .validate(data);
    if (validationResult !== true) {
      return validationResult;
    }
    // TODO create preparedOrder
    // const res = await this.tokensService
    //   .getTokenByUserId(user.id);
    // return res || new ApiTokenEntity();
  }

  @Post('order')
  public async createOrder(
    @User() user: UserEntity,
  ) {
    // const permission = await this.rolesAndPermissions
    //   .getPermissionByKey(ApiV1PermissionKeys.GenerateOwnApiToken);
    // const allowGenerateToken = await this.rolesAndPermissions
    //   .checkPermissionByRoles(
    //     permission,
    //     user.roles,
    //   );
    // if (allowGenerateToken) {
    //   const oldToken = await this.tokensService
    //     .getTokenByUserId(user.id);
    //   if (oldToken) {
    //     await this.tokensService
    //       .removeToken(oldToken.token);
    //   }
    //   const newToken = await this.tokensService
    //     .generateToken(user.id);
    //   return newToken;
    // } else {
    //   throw new UnauthorizedException('You cannot generate Api tokens');
    // }
  }
}
