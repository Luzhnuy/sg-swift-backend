import { Injectable } from '@nestjs/common';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { TranslationsConfig } from '../providers/translations-config';

@Injectable()
export class TranslationsModuleService {

  constructor(
    private config: TranslationsConfig,
    private rolesAndPermissions: RolesAndPermissionsService,
  ) {}

  public async init() {
    await this.rolesAndPermissions.registerModuleConfig(this.config);
  }
}
