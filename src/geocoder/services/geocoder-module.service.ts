import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { GeocoderConfigService } from './geocoder-config.service';

@Injectable()
export class GeocoderModuleService {

  constructor(
    private config: GeocoderConfigService,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    // TODO fill auto-filling object
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
