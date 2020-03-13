import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { CustomersConfig } from '../providers/customers-config';

@Injectable()
export class CustomersModuleService {

  constructor(
    private config: CustomersConfig,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    // TODO fill auto-filling object
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
