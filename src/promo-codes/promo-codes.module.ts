import { MiddlewareConsumer, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCodesController } from './promo-codes.controller';
import { PromoCodesService } from './promo-codes.service';
import { CmsModule } from '../cms/cms.module';
import { PromoCodesModuleConfig } from './promo-codes-module-config';
import { PromoCodesModuleService } from './promo-codes-module.service';
import { PromoCodeEntity } from './entities/promo-code.entity';

@Module({
  controllers: [PromoCodesController],
  providers: [PromoCodesService, PromoCodesModuleService, PromoCodesModuleConfig],
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      PromoCodeEntity,
    ]),
  ],
  exports: [
    PromoCodesService,
  ],
})
export class PromoCodesModule {
  constructor(
    private config: PromoCodesModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.config.init();
  }
}
