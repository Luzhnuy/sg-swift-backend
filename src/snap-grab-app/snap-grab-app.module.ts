import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CmsModule } from '../cms/cms.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SgInfoBoxEntity } from './entities/sg-info-box.entity';
import { SnapGrabAppModuleService } from './services/snap-grab-app-module.service';
import { SnapGrabAppConfig } from './providers/snap-grab-app-config';
import { SgInfoBoxController } from './controllers/sg-info-box.controller';
import { SgTokensController } from './controllers/sg-tokens.controller';
import { SgTokenEntity } from './entities/sg-token.entity';

@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      SgInfoBoxEntity,
      SgTokenEntity,
    ]),
  ],
  controllers: [SgInfoBoxController, SgTokensController],
  providers: [SnapGrabAppModuleService, SnapGrabAppConfig],
})
export class SnapGrabAppModule {
  constructor(
    private snapGrabAppModuleService: SnapGrabAppModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.snapGrabAppModuleService.init();
  }
}
