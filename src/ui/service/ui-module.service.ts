import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { UiConfig } from '../providers/ui-config';

@Injectable()
export class UiModuleService {

  constructor(
    private config: UiConfig,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
