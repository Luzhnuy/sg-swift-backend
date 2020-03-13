import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { MerchantsConfigService } from './merchants-config.service';

@Injectable()
export class MerchantsModuleService {

  constructor(
    private config: MerchantsConfigService,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    // TODO fill auto-filling object
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
