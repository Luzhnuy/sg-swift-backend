import { Injectable } from '@nestjs/common';
import { PermissionEntity } from '../../cms/roles-and-permissions/entities/permission.entity';
import { ContentPermissionHelper } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';

export enum GeocoderPermissionKeys {
  AddZipcodeToList = 'GeocoderAddZipcodeToList',
  RemoveZipcodeFromList = 'GeocoderRemoveZipcodeFromList',
}

@Injectable()
export class GeocoderConfigService extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Geocoder';

  public readonly MODULE_ROLES = [];

  public readonly MODULE_PERMISSIONS = [
    new PermissionEntity({
      key: GeocoderPermissionKeys.AddZipcodeToList,
      description: 'Add zipcode to lists',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: GeocoderPermissionKeys.RemoveZipcodeFromList,
      description: 'Remove zipcode from lists',
      group: this.MODULE_GROUP,
    }),
  ];

  public readonly MODULE_CONTENTS = [];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
    // this.addDefPerRoleShort(GeocoderPermissionKeys.AddZipcodeToList, RolesAndPermissionsRolesName.Admin);
    // this.addDefPerRoleShort(GeocoderPermissionKeys.RemoveZipcodeFromList, RolesAndPermissionsRolesName.Admin);
  }

}
