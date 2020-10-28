import { Injectable } from '@nestjs/common';
import { RoleEntity } from '../../cms/roles-and-permissions/entities/role.entity';
import { PermissionEntity } from '../../cms/roles-and-permissions/entities/permission.entity';
import { MerchantEntity } from '../entities/merchant.entity';
import { UsersPermissionsKeys } from '../../cms/users/services/users-config.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import {
  RolesAndPermissionsPermissionsKeys,
  RolesAndPermissionsRolesName,
} from '../../cms/roles-and-permissions/services/roles-and-permissions-config.service';
import { MenuItemEntity } from '../entities/menu-item.entity';
import { MenuCategoryEntity } from '../entities/menu-category.entity';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';
import { PaymentCardEntity } from '../../payments/entities/payment-card.entity';
import { MenuOptionEntity } from '../entities/menu-option.entity';
import { MenuItemOptionEntity } from '../entities/menu-item-option.entity';
import { MenuSubOptionEntity } from '../entities/menu-sub-option.entity';

export enum MerchantsPermissionKeys {
  ChangeEnableBooking = 'MerchantsChangeEnableBooking',
  ChangeEnableMenu = 'MerchantsChangeEnableMenu',
}

export enum MerchantsRolesName {
  Merchant = 'Merchant',
}

@Injectable()
export class MerchantsConfigService extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Merchants';

  public readonly MODULE_ROLES = [
    new RoleEntity({
      name: MerchantsRolesName.Merchant,
      description: 'Business owner (Merchant).',
      group: this.MODULE_GROUP,
      isDefault: true,
    }),
  ];

  public readonly MODULE_PERMISSIONS = [
    new PermissionEntity({
      key: MerchantsPermissionKeys.ChangeEnableBooking,
      description: 'Enable/Disable creating Booking orders',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: MerchantsPermissionKeys.ChangeEnableMenu,
      description: 'Enable/Disable creating Menu orders',
      group: this.MODULE_GROUP,
    }),
  ];

  public readonly MODULE_CONTENTS = [
    MerchantEntity,
    MenuCategoryEntity,
    MenuItemEntity,
    MenuOptionEntity,
    MenuSubOptionEntity,
    MenuItemOptionEntity,
  ];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);

    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, MerchantEntity.name, MerchantsRolesName.Merchant);
    this.addDefPerRole(ContentPermissionsKeys.ContentEditOwn, MerchantEntity.name, MerchantsRolesName.Merchant);

    this.addAllOwnPermissions(MenuOptionEntity.name, MerchantsRolesName.Merchant);
    this.addAllOwnPermissions(MenuSubOptionEntity.name, MerchantsRolesName.Merchant);
    this.addAllOwnPermissions(MenuItemEntity.name, MerchantsRolesName.Merchant);
    this.addAllOwnPermissions(MenuItemOptionEntity.name, MerchantsRolesName.Merchant);
    this.addAllOwnPermissions(MenuCategoryEntity.name, MerchantsRolesName.Merchant);
    this.addAllOwnPermissions(PaymentCardEntity.name, MerchantsRolesName.Merchant);

    this.addDefPerRoleShort(MerchantsPermissionKeys.ChangeEnableBooking, MerchantsRolesName.Merchant);
    this.addDefPerRoleShort(UsersPermissionsKeys.EditSelfUser, MerchantsRolesName.Merchant);
    this.addDefPerRoleShort(RolesAndPermissionsPermissionsKeys.ViewRole, MerchantsRolesName.Merchant);

    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MenuCategoryEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MenuCategoryEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MenuItemEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MenuItemEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewUnpublished, MenuItemEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MerchantEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MerchantEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MenuOptionEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MenuOptionEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MenuItemOptionEntity.name, RolesAndPermissionsRolesName.Anonymous);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MenuItemOptionEntity.name, RolesAndPermissionsRolesName.Anonymous);
  }

}
