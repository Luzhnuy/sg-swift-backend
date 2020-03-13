import { MiddlewareConsumer, Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsEntity } from './entities/settings.entity';
import { CmsModule } from '../cms/cms.module';
import { SettingsModuleService } from './services/settings-module.service';
import { SettingsConfig } from './providers/settings-config';
import { SettingsService } from './services/settings.service';
import { SettingsController } from './controllers/settings.controller';

@Global()
@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      SettingsEntity,
    ]),
  ],
  controllers: [
    SettingsController,
  ],
  providers: [
    SettingsConfig,
    SettingsModuleService,
    SettingsService,
  ],
  exports: [
    SettingsService,
  ],
})
export class SettingsModule {

  constructor(
    private moduleService: SettingsModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.moduleService.init();
  }
}
