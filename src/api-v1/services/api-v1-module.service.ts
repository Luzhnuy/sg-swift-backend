import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ApiV1Config } from '../providers/api-v1-config';

@Injectable()
export class ApiV1ModuleService {

  constructor(
    private config: ApiV1Config,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    // TODO fill auto-filling object
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
