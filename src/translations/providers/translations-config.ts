import { Injectable } from '@nestjs/common';
import { PermissionEntity } from '../../cms/roles-and-permissions/entities/permission.entity';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';

export enum TranslationPermissionKeys {
  AllowEditWebTranslations = 'TranslationsAllowEditWebTranslations',
}

@Injectable()
export class TranslationsConfig extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Translations';

  public readonly MODULE_PERMISSIONS = [
    new PermissionEntity({
      key: TranslationPermissionKeys.AllowEditWebTranslations,
      description: 'Allow edit translations for e-commerce',
      group: this.MODULE_GROUP,
    }),
  ];

  public readonly MODULE_CONTENTS = [];
  public readonly MODULE_ROLES = [];
  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
    // this.addDefPerRoleShort(TranslationPermissionKeys.AllowEditWebTranslations, DriversRolesName.Driver);
  }

}
