import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { CustomersRolesName } from '../../customers/providers/customers-config';
import { FavoriteEntity } from '../entities/favorite.entity';

@Injectable()
export class FavoritesConfig  extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Favorites';

  public readonly MODULE_ROLES = [];

  public readonly MODULE_PERMISSIONS = [];

  public readonly MODULE_CONTENTS = [
    FavoriteEntity,
  ];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);

    this.addDefPerRole(ContentPermissionsKeys.ContentAdd, FavoriteEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, FavoriteEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentEditOwn, FavoriteEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentRemoveOwn, FavoriteEntity.name, CustomersRolesName.Customer);
  }
}
