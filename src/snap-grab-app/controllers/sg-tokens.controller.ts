import { Body, Controller, Delete, Param, Post, Put, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { Repository } from 'typeorm';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { MenuItemEntity } from '../../merchants/entities/menu-item.entity';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { UsersService } from '../../cms/users/services/users.service';
import { SgTokenEntity } from '../entities/sg-token.entity';

@Controller('sg-tokens')
@CrudEntity(SgTokenEntity)
export class SgTokensController extends CrudController  {

  constructor(
    @InjectRepository(SgTokenEntity)
    protected readonly repository: Repository<SgTokenEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    protected usersService: UsersService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Post('')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  async createContentEntity(@Body() entity: SgTokenEntity, @User() user: UserEntity) {
    const loggedAdminUser = await this.usersService.loginUserById(user.id);
    entity.value = loggedAdminUser.authToken;
    return super.createContentEntity(entity, user);
  }

  @Delete(':id')
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentRemoveOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentRemove];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  async deleteContentEntity(@Param('id') id: number) {
    const entity = await this.repository.findOne({ id });
    return await this.repository.remove(entity);
  }
}
