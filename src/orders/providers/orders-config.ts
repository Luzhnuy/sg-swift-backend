import { Injectable } from '@nestjs/common';
import { PermissionEntity } from '../../cms/roles-and-permissions/entities/permission.entity';
import { OrderEntity } from '../entities/order.entity';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { DriversRolesName } from '../../drivers/providers/drivers-config';
import { MerchantsRolesName } from '../../merchants/services/merchants-config.service';
import { CustomersRolesName } from '../../customers/providers/customers-config';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';

export enum PermissionKeys {
  AllowChangeOrderStatus = 'OrdersAllowChangeOrderStatus',
  AllowDownloadReport = 'OrdersAllowDownloadReport',
}

@Injectable()
export class OrdersConfig extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Orders';
  public readonly MODULE_PERMISSIONS = [
    new PermissionEntity({
      key: PermissionKeys.AllowChangeOrderStatus,
      description: 'Allow to assign driver to order and change order status (for Drivers app)',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: PermissionKeys.AllowDownloadReport,
      description: 'Allow to download orders reports',
      group: this.MODULE_GROUP,
    }),
  ];
  public readonly MODULE_CONTENTS = [
    OrderEntity,
  ];
  public readonly MODULE_ROLES = [];
  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
    this.addDefPerRoleShort(PermissionKeys.AllowChangeOrderStatus, DriversRolesName.Driver);
    this.addDefPerRoleShort(PermissionKeys.AllowChangeOrderStatus, CustomersRolesName.Customer);
    // this.addDefPerRoleShort(PermissionKeys.AllowChangeOrderStatus, MerchantsRolesName.Merchant);

    this.addDefPerRoleShort(PermissionKeys.AllowDownloadReport, MerchantsRolesName.Merchant);

    this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, OrderEntity.name, DriversRolesName.Driver);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewPublished, OrderEntity.name, DriversRolesName.Driver);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, OrderEntity.name, MerchantsRolesName.Merchant);
    this.addDefPerRole(ContentPermissionsKeys.ContentViewOwn, OrderEntity.name, CustomersRolesName.Customer);
    this.addDefPerRole(ContentPermissionsKeys.ContentAdd, OrderEntity.name, MerchantsRolesName.Merchant);
    this.addDefPerRole(ContentPermissionsKeys.ContentAdd, OrderEntity.name, CustomersRolesName.Customer);
  }

}
