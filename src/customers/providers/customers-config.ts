import { Injectable } from '@nestjs/common';
import { RoleEntity } from '../../cms/roles-and-permissions/entities/role.entity';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { CustomerEntity } from '../entities/customer.entity';
import { CustomerDeviceInfoEntity } from '../entities/customer-device-info.entity';
import { CustomerMetadataEntity } from '../entities/customer-metadata.entity';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';
import { UsersPermissionsKeys } from '../../cms/users/services/users-config.service';
import { MenuCategoryEntity } from '../../merchants/entities/menu-category.entity';
import { MenuItemEntity } from '../../merchants/entities/menu-item.entity';
import { MerchantEntity } from '../../merchants/entities/merchant.entity';
import { PaymentCardEntity } from '../../payments/entities/payment-card.entity';
import { MenuOptionEntity } from '../../merchants/entities/menu-option.entity';
import { MenuItemOptionEntity } from '../../merchants/entities/menu-item-option.entity';

export enum CustomersRolesName {
  Customer = 'Customer',
}

@Injectable()
export class CustomersConfig extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Customers';

  public readonly MODULE_ROLES = [
    new RoleEntity({
      name: CustomersRolesName.Customer,
      description: 'Snap Grab app user.',
      group: this.MODULE_GROUP,
      isDefault: true,
    }),
  ];

  public readonly MODULE_PERMISSIONS = [];

  public readonly MODULE_CONTENTS = [
    CustomerEntity,
    CustomerMetadataEntity,
    CustomerDeviceInfoEntity,
  ];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, CustomerEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentEditOwn, CustomerEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, CustomerMetadataEntity.name, CustomersRolesName.Customer);

    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MenuCategoryEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MenuCategoryEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MenuItemEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MenuItemEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewUnpublished, MenuItemEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MerchantEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MerchantEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MenuOptionEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MenuOptionEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, MenuItemOptionEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, MenuItemOptionEntity.name, CustomersRolesName.Customer);

    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, PaymentCardEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentEditOwn, PaymentCardEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentAdd, PaymentCardEntity.name, CustomersRolesName.Customer);

    this.addDefPerRoleShort(UsersPermissionsKeys.EditSelfUser, CustomersRolesName.Customer);
  }
}
