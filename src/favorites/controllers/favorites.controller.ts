import { Controller, HttpService } from '@nestjs/common';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { FavoriteEntity } from '../entities/favorite.entity';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper } from '../../cms/roles-and-permissions/misc/content-permission-helper';

@Controller('favorites')
@CrudEntity(FavoriteEntity)
export class FavoritesController extends CrudController {

  constructor(
    @InjectRepository(FavoriteEntity)
    protected readonly repository: Repository<FavoriteEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }
}
