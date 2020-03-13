import { Injectable } from '@nestjs/common';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { SgInfoBoxEntity } from '../entities/sg-info-box.entity';
import { SgTokenEntity } from '../entities/sg-token.entity';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';
import { CustomersRolesName } from '../../customers/providers/customers-config';
import { RolesAndPermissionsRolesName } from '../../cms/roles-and-permissions/services/roles-and-permissions-config.service';

@Injectable()
export class SnapGrabAppConfig extends RolesAndPermissionsModuleConfig  {
  public readonly MODULE_GROUP = 'SnapGrab App';

  public readonly MODULE_ROLES = [];

  public readonly MODULE_PERMISSIONS = [];

  public readonly MODULE_CONTENTS = [
    SgInfoBoxEntity,
    SgTokenEntity,
  ];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, SgInfoBoxEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, SgInfoBoxEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, SgInfoBoxEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, SgInfoBoxEntity.name, RolesAndPermissionsRolesName.Anonymous);
  }
}
