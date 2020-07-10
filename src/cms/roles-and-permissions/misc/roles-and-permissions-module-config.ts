import { RoleEntity } from '../../roles-and-permissions/entities/role.entity';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../roles-and-permissions/misc/content-permission-helper';
import { PermissionEntity } from '../../roles-and-permissions/entities/permission.entity';
import { MenuOptionEntity } from '../../../merchants/entities/menu-option.entity';
import { MerchantsRolesName } from '../../../merchants/services/merchants-config.service';

export abstract class RolesAndPermissionsModuleConfig {
  public readonly abstract MODULE_GROUP: string;
  public readonly abstract MODULE_ROLES: RoleEntity[];
  public readonly abstract MODULE_PERMISSIONS: PermissionEntity[];
  // public readonly abstract MODULE_CONTENTS: ContentEntity[];
  public readonly abstract MODULE_CONTENTS: any[];
  public readonly abstract MODULE_DEFAULT_PERMISSION_ROLES: {
    [k: string]: boolean;
  };

  protected constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) { }

  addAllOwnPermissions(name, role) {
    this.addDefPerRole(ContentPermissionsKeys.ContentAdd, name, role);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, name, role);
    this.addDefPerRole(ContentPermissionsKeys.ContentEditOwn, name, role);
    this.addDefPerRole(ContentPermissionsKeys.ContentRemoveOwn, name, role);
  }

  protected addDefPerRole(key, name, role) {
    this.MODULE_DEFAULT_PERMISSION_ROLES[
      this.contentPermissionHelper
        .getPermissionRoleKey(
          this.contentPermissionHelper.getKeyByContentName(
            this.contentPermissionHelper.getKeyAsString(key),
            name,
          ),
          role,
        )
      ] = true;
  }

  protected addDefPerRoleShort(key, role) {
    this.MODULE_DEFAULT_PERMISSION_ROLES[
      this.contentPermissionHelper
        .getPermissionRoleKey(
          key,
          role,
        )
      ] = true;
  }
}
