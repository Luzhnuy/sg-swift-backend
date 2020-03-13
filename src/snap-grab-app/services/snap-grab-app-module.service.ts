import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { SnapGrabAppConfig } from '../providers/snap-grab-app-config';

@Injectable()
export class SnapGrabAppModuleService {

  constructor(
    private config: SnapGrabAppConfig,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
