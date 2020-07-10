import { Controller } from '@nestjs/common';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuOptionEntity } from '../entities/menu-option.entity';

@Controller('menu-options')
@CrudEntity(MenuOptionEntity)
export class MenuOptionsController extends CrudController {
  constructor(
    @InjectRepository(MenuOptionEntity)
      protected readonly repository: Repository<MenuOptionEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  protected async getQueryBuilder(user, query) {
    delete query.hasCreditCard;
    const builder = await super.getQueryBuilder(user, query);
    builder
      .leftJoinAndSelect('entity.subOptions', 'subOptions');
    const secureWhere = await this.getWhereRestrictionsByPermissions(user);
    if (secureWhere) {
      const keys = Object.keys(secureWhere);
      if (keys.length === 1 && keys[0] === 'isPublished' && secureWhere.isPublished) {
        builder.andWhere('entity.enabled = :enabled', { enabled: true });
        builder.andWhere('subOptions.isPublished = :isPublished', { isPublished: true });
        builder.andWhere('subOptions.enabled = :enabled', { enabled: true });
      }
    }
    return builder;
  }

}
