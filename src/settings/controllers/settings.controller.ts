import {
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  HttpService,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
  Headers, Delete,
} from '@nestjs/common';
import { PermissionsGuard } from '../../cms/roles-and-permissions/guards/permissions.guard';
import { SettingsService } from '../services/settings.service';
import { SettingsEntity } from '../entities/settings.entity';
import { SettingsPermissionKeys } from '../providers/settings-config';

@Controller('settings')
export class SettingsController {

  constructor(
    private settingsService: SettingsService,
  ) {
  }

  @Get('')
  @UseGuards(PermissionsGuard(() => SettingsPermissionKeys.AllowViewSettingsVariables))
  getAll() {
    const settings = this.settingsService.all();
    return this.settingsService.all();
  }

  @Post('')
  @UseGuards(PermissionsGuard(() => SettingsPermissionKeys.AllowEditSettingsVariables))
  async save(@Body() settings: SettingsEntity) {
    return await this.settingsService.set(settings);
  }

  @Delete('')
  @UseGuards(PermissionsGuard(() => SettingsPermissionKeys.AllowEditSettingsVariables))
  async remove(@Body() settingsKeys: string[]) {
    for (const i in settingsKeys) {
      const settingsItem = this.settingsService.get(settingsKeys[i]);
      if (!settingsItem.isDefault) {
        await this.settingsService.remove(settingsKeys[i]);
      }
    }
    return this.settingsService.all();
  }

}
