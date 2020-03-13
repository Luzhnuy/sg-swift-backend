import { Injectable } from '@nestjs/common';
import { PermissionEntity } from '../../cms/roles-and-permissions/entities/permission.entity';

export enum UIPermissionKeys {
  AllowDashboardAccess = 'UIAllowDashboardAccess',
  AllowUsersAccess = 'UIAllowUsersAccess',
  AllowRolesAndPermissionAccess = 'UIAllowRolesAndPermissionAccess',
  AllowDriversAccess = 'UIAllowDriversAccess',
  AllowOrdersAccess = 'UIAllowOrdersAccess',
  AllowMapsAccess = 'UIAllowMapsAccess',
  AllowSettingsAccess = 'UIAllowSettingsAccess',
  AllowReportsAccess = 'UIAllowReportsAccess',
  AllowMerchantsAccess = 'UIAllowMerchantsAccess',
  AllowSnapGrabAppAccess = 'UIAllowSnapGrabAppAccess',
  AllowApiKeysAccess = 'UIAllowApiKeysAccess',
  AllowPromoCodesAccess = 'UIAllowPromoCodesAccess',
  AllowCustomersAccess = 'UIAllowCustomersAccess',
}

@Injectable()
export class UiConfig {

  public readonly MODULE_GROUP = 'User Interface';

  public readonly MODULE_PERMISSIONS = [
    new PermissionEntity({
      key: UIPermissionKeys.AllowDashboardAccess,
      description: 'View Dashboard section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowRolesAndPermissionAccess,
      description: 'View Roles and Permissions section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowUsersAccess,
      description: 'View Users section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowDriversAccess,
      description: 'View Drivers section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowOrdersAccess,
      description: 'View Orders section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowMapsAccess,
      description: 'View Dispatching Map section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowSettingsAccess,
      description: 'View Settings section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowReportsAccess,
      description: 'View Reports section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowMerchantsAccess,
      description: 'View Merchants section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowCustomersAccess,
      description: 'View Customers section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowSnapGrabAppAccess,
      description: 'View SnapGrab App section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowApiKeysAccess,
      description: 'View Api Keys section',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: UIPermissionKeys.AllowPromoCodesAccess,
      description: 'View Promo Codes section',
      group: this.MODULE_GROUP,
    }),
  ];

}
