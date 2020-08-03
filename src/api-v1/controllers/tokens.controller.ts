import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ApiV1PermissionKeys } from '../providers/api-v1-config';
import { ApiTokenEntity } from '../entities/api-token.entity';
import { ApiTokensService } from '../services/api-tokens.service';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { CancelOrderData } from '../data/misc';
import { UsersService } from '../../cms/users/services/users.service';

@Controller('tokens')
export class TokensController {
  constructor(
    private tokensService: ApiTokensService,
    private usersService: UsersService,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {
  }

  @Get('')
  public async getOwnToken(
    @User() user: UserEntity,
  ) {
    const res = await this.tokensService
      .getTokenByUserId(user.id);
    return res || new ApiTokenEntity();
  }

  @Post('')
  public async generateNewToken(
    @Body() data: { password: string },
    @User() user: UserEntity,
  ) {
    const permission = await this.rolesAndPermissions
      .getPermissionByKey(ApiV1PermissionKeys.GenerateOwnApiToken);
    const allowGenerateToken = await this.rolesAndPermissions
      .checkPermissionByRoles(
        permission,
        user.roles,
      );
    if (allowGenerateToken) {
      const passwordCorrect = await this.usersService
        .checkUserPassword(user.id, data.password);
      if (passwordCorrect) {
        const oldToken = await this.tokensService
          .getTokenByUserId(user.id);
        if (oldToken) {
          await this.tokensService
            .removeToken(oldToken.token);
        }
        const newToken = await this.tokensService
          .generateToken(user.id);
        return newToken;
      }
    } else {
      throw new UnauthorizedException('You cannot generate Api tokens');
    }
  }
}
