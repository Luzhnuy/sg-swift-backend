import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { FavoritesConfig } from '../providers/favorites-config';

@Injectable()
export class FavoritesModuleService {
  constructor(
    private config: FavoritesConfig,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
