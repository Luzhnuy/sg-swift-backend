import { Injectable } from '@nestjs/common';
import { PromoCodesModuleConfig } from './promo-codes-module-config';
import { RolesAndPermissionsService } from '../cms/roles-and-permissions/services/roles-and-permissions.service';

@Injectable()
export class PromoCodesModuleService {

  constructor(
    private config: PromoCodesModuleConfig,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }

}
