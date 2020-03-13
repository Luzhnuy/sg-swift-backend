import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsModuleConfig } from '../cms/roles-and-permissions/misc/roles-and-permissions-module-config';
import { ContentPermissionHelper } from '../cms/roles-and-permissions/misc/content-permission-helper';
import { PromoCodeEntity } from './entities/promo-code.entity';

@Injectable()
export class PromoCodesModuleConfig  extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Promo Codes';
  public readonly MODULE_PERMISSIONS = [];
  public readonly MODULE_CONTENTS = [
    PromoCodeEntity,
  ];
  public readonly MODULE_ROLES = [];
  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
  }

}
