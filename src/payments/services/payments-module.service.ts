import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { PaymentsConfigService } from './payments-config.service';

@Injectable()
export class PaymentsModuleService {
  constructor(
    private config: PaymentsConfigService,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    // TODO fill auto-filling object
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
