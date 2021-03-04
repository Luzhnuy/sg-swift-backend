import { MiddlewareConsumer, Module } from '@nestjs/common';
import { TranslationsController } from './controllers/translations.controller';
import { TranslationsModuleService } from './services/translations-module.service';
import { TranslationsConfig } from './providers/translations-config';
import { CmsModule } from '../cms/cms.module';
import { LocalesController } from './controllers/locales.controller';

@Module({
  imports: [
    CmsModule,
  ],
  controllers: [
    TranslationsController,
    LocalesController,
  ],
  providers: [
    TranslationsConfig,
    TranslationsModuleService,
  ],
})
export class TranslationsModule {

  constructor(
    private moduleService: TranslationsModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.moduleService.init();
  }
}
