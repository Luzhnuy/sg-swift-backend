import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';
import { PermissionEntity } from '../../cms/roles-and-permissions/entities/permission.entity';
import { ContentPermissionHelper } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { MerchantsRolesName } from '../../merchants/services/merchants-config.service';

export enum ApiV1PermissionKeys {
  GenerateOwnApiToken = 'ApiV1GenerateOwnApiToken',
}

@Injectable()
export class ApiV1Config  extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Booking Api';

  public readonly MODULE_ROLES = [
    // new RoleEntity({
    //   name: MerchantsRolesName.Merchant,
    //   description: 'Business owner (Merchant).',
    //   group: this.MODULE_GROUP,
    //   isDefault: true,
    // }),
  ];

  public readonly MODULE_PERMISSIONS = [
    new PermissionEntity({
      key: ApiV1PermissionKeys.GenerateOwnApiToken,
      description: 'Generate own Api tokens',
      group: this.MODULE_GROUP,
    }),
  ];

  public readonly MODULE_CONTENTS = [];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
    this.addDefPerRoleShort(ApiV1PermissionKeys.GenerateOwnApiToken, MerchantsRolesName.Merchant);
  }

}
