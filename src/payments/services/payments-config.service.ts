import { Injectable } from '@nestjs/common';
import { ContentPermissionHelper } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { PaymentCardEntity } from '../entities/payment-card.entity';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';

@Injectable()
export class PaymentsConfigService extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Payments';

  public readonly MODULE_ROLES = [];

  public readonly MODULE_PERMISSIONS = [];

  public readonly MODULE_CONTENTS = [
    PaymentCardEntity,
  ];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
  ) {
    super(contentPermissionHelper);
  }
}
