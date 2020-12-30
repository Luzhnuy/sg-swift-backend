import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';
import { RoleEntity } from '../../cms/roles-and-permissions/entities/role.entity';
import { CollaborationRequestEntity } from '../entities/collaboration-request.entity';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { MenuCategoryEntity } from '../../merchants/entities/menu-category.entity';
import { RolesAndPermissionsRolesName } from '../../cms/roles-and-permissions/services/roles-and-permissions-config.service';

export enum MerchantsPermissionKeys {
  ChangeEnableBooking = 'MerchantsChangeEnableBooking',
  ChangeEnableMenu = 'MerchantsChangeEnableMenu',
}

export enum MerchantsRolesName {
  Merchant = 'Merchant',
}

@Injectable()
export class CollaborationRequestsConfig extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Collaboration Requests';

  public readonly MODULE_ROLES = [];

  public readonly MODULE_PERMISSIONS = [];

  public readonly MODULE_CONTENTS = [
    CollaborationRequestEntity,
  ];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
    this.addDefPerRole(ContentPermissionsKeys.ContentAdd, CollaborationRequestEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentAdd, CollaborationRequestEntity.name, RolesAndPermissionsRolesName.User);
  }

}
