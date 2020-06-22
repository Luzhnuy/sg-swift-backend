import { Controller } from '@nestjs/common';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuItemOptionEntity } from '../entities/menu-item-option.entity';
import { MenuOptionEntity } from '../entities/menu-option.entity';

@Controller('menu-item-option')
@CrudEntity(MenuOptionEntity)
export class MenuOptionsController extends CrudController {
  constructor(
    @InjectRepository(MenuItemOptionEntity)
      protected readonly repository: Repository<MenuOptionEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

}
