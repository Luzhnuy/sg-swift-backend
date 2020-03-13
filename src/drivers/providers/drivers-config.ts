import { Injectable } from '@nestjs/common';
import { RoleEntity } from '../../cms/roles-and-permissions/entities/role.entity';
import { DriverProfileEntity } from '../entities/driver-profile.entity';
import { DriverStatusEntity } from '../entities/driver-status.entity';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { UsersPermissionsKeys } from '../../cms/users/services/users-config.service';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';

export enum DriversRolesName {
  Driver = 'Driver',
}

@Injectable()
export class DriversConfig extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Drivers';

  public readonly MODULE_ROLES = [
    new RoleEntity({
      name: DriversRolesName.Driver,
      description: 'Driver role',
      group: this.MODULE_GROUP,
      isDefault: true,
    }),
  ];

  public readonly MODULE_PERMISSIONS = [];

  public readonly MODULE_CONTENTS = [
    DriverProfileEntity,
    DriverStatusEntity,
  ];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, DriverProfileEntity.name, DriversRolesName.Driver);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, DriverStatusEntity.name, DriversRolesName.Driver);
    this.addDefPerRole(ContentPermissionsKeys.ContentEditOwn, DriverStatusEntity.name, DriversRolesName.Driver);
    this.addDefPerRoleShort(UsersPermissionsKeys.EditSelfUser, DriversRolesName.Driver);
  }
}
