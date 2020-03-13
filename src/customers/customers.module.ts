import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CustomersController } from './controllers/customers.controller';
import { CustomersService } from './services/customers.service';
import { CmsModule } from '../cms/cms.module';
import { SettingsModule } from '../settings/settings.module';
import { SmsActivationModule } from '../sms-activation/sms-activation.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerEntity } from './entities/customer.entity';
import { CustomerMetadataEntity } from './entities/customer-metadata.entity';
import { CustomerDeviceInfoEntity } from './entities/customer-device-info.entity';
import { CustomersConfig } from './providers/customers-config';
import { CustomersModuleService } from './services/customers-module.service';
import { MerchantsModule } from '../merchants/merchants.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      CustomerEntity,
      CustomerMetadataEntity,
      CustomerDeviceInfoEntity,
    ]),
    SettingsModule,
    SmsActivationModule,
    MerchantsModule,
    PaymentsModule,
  ],
  providers: [
    CustomersService,
    CustomersConfig,
    CustomersModuleService,
  ],
  controllers: [CustomersController],
  exports: [
    CustomersService,
  ],
})
export class CustomersModule {
  constructor(
    private moduleService: CustomersModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.moduleService.init();
  }
}
