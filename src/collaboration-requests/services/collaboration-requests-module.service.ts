import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { CollaborationRequestsConfig } from '../providers/collaboration-requests-config';

@Injectable()
export class CollaborationRequestsModuleService {

  constructor(
    private config: CollaborationRequestsConfig,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
