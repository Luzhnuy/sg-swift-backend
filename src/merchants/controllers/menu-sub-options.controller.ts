import { Controller } from '@nestjs/common';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuSubOptionEntity } from '../entities/menu-sub-option.entity';

@Controller('menu-sub-options')
@CrudEntity(MenuSubOptionEntity)
export class MenuSubOptionsController extends CrudController {
  constructor(
    @InjectRepository(MenuSubOptionEntity)
      protected readonly repository: Repository<MenuSubOptionEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

}
