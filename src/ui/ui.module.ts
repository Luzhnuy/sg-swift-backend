import { MiddlewareConsumer, Module } from '@nestjs/common';
import { UiConfig } from './providers/ui-config';
import { UiModuleService } from './service/ui-module.service';
import { CmsModule } from '../cms/cms.module';

@Module({
  imports: [
    CmsModule,
  ],
  providers: [UiConfig, UiModuleService],

})
export class UiModule {

  constructor(
    private moduleService: UiModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.moduleService.init();
  }
}
