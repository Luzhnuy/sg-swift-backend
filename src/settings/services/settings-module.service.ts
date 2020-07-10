import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { SettingsConfig } from '../providers/settings-config';

@Injectable()
export class SettingsModuleService {

  constructor(
    private readonly config: SettingsConfig,
    private readonly rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }

}
