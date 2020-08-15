import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ApiV1PermissionKeys } from '../providers/api-v1-config';
import { ApiTokenEntity } from '../entities/api-token.entity';
import { ApiTokensService } from '../services/api-tokens.service';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { CancelOrderData } from '../data/misc';
import { UsersService } from '../../cms/users/services/users.service';
import { ApiTestTokenEntity } from '../entities/api-test-token.entity';

@Controller('tokens')
export class TokensController {
  constructor(
    private tokensService: ApiTokensService,
    private usersService: UsersService,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  @Get('')
  public async getOwnToken(
    @User() user: UserEntity,
  ) {
    const res = await this.tokensService
      .getTokenByUserId(user.id);
    return res || new ApiTokenEntity();
  }

  @Get('test')
  public async getOwnTestToken(
    @User() user: UserEntity,
  ) {
    const res = await this.tokensService
      .getTokenByUserId(user.id, false);
    return res || new ApiTestTokenEntity();
  }

  @Post('')
  public async generateNewProductionToken(
    @Body() data: { password: string },
    @User() user: UserEntity,
  ) {
    return this.generateNewToken(user, data.password, true);
  }

  @Post('test')
  public async generateNewTestingToken(
    @Body() data: { password: string },
    @User() user: UserEntity,
  ) {
    return this.generateNewToken(user, data.password, false);
  }

  private async generateNewToken(user: UserEntity, password: string, production: boolean) {
    const isOk = await this.checkPermission(user, password);
    if (isOk) {
      const oldToken = await this.tokensService
        .getTokenByUserId(user.id, production);
      if (oldToken) {
        await this.tokensService
          .removeToken(oldToken.token, production);
      }
      const newToken = await this.tokensService
        .generateToken(user.id, production);
      return newToken;
    }
  }

  private async checkPermission(user: UserEntity, password: string) {
    const permission = await this.rolesAndPermissions
      .getPermissionByKey(ApiV1PermissionKeys.GenerateOwnApiToken);
    const allowGenerateToken = await this.rolesAndPermissions
      .checkPermissionByRoles(
        permission,
        user.roles,
      );
    if (allowGenerateToken) {
      return await this.usersService
        .checkUserPassword(user.id, password);
    } else {
      throw new UnauthorizedException('You cannot generate Api tokens');
    }
  }
}
