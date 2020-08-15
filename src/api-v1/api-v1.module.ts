import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CmsModule } from '../cms/cms.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTokensService } from './services/api-tokens.service';
import { SharedModule } from '../shared/shared.module';
import { OrdersModule } from '../orders/orders.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { ApiTokenEntity } from './entities/api-token.entity';
import { TokensController } from './controllers/tokens.controller';
import { ApiV1ModuleService } from './services/api-v1-module.service';
import { ApiV1Config } from './providers/api-v1-config';
import { ApiOrdersService } from './services/api-orders.service';
import { GeocoderModule } from '../geocoder/geocoder.module';
import { ApiV1Controller } from './controllers/api-v1.controller';
import { PaymentsModule } from '../payments/payments.module';
import { OrderTokenEntity } from './entities/order-token.entity';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { DriversModule } from '../drivers/drivers.module';
import { SettingsModule } from '../settings/settings.module';
import { EmailDistributorModule } from '../email-distributor/email-distributor.module';
import { ApiTestTokenEntity } from './entities/api-test-token.entity';

@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      ApiTokenEntity,
      ApiTestTokenEntity,
      OrderTokenEntity,
    ]),
    GeocoderModule,
    PaymentsModule,
    OrdersModule,
    MerchantsModule,
    SchedulerModule,
    DriversModule,
    SettingsModule,
    EmailDistributorModule,
  ],
  controllers: [
    TokensController,
    ApiV1Controller,
  ],
  providers: [
    ApiTokensService,
    ApiV1Config,
    ApiV1ModuleService,
    ApiOrdersService,
  ],
  exports: [
    ApiTokensService,
  ],
})
export class ApiV1Module {
  constructor(
    private apiV1ModuleService: ApiV1ModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.apiV1ModuleService.init();
  }
}
