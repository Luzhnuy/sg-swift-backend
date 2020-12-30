import { HttpModule, MiddlewareConsumer, Module } from '@nestjs/common';
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
import { EmailDistributorModule } from '../email-distributor/email-distributor.module';
import { JwtModule } from '@nestjs/jwt';
import { AppleTempUserEntity } from './entities/apple-temp-user.entity';

@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      CustomerEntity,
      CustomerMetadataEntity,
      CustomerDeviceInfoEntity,
      AppleTempUserEntity,
    ]),
    JwtModule.register({
      // secret: 'fe9604e502a4fa7b0dd',
      secret: '86D88Kf',
      signOptions: {
        // expiresIn: 3600,
      },
    }),
    EmailDistributorModule,
    HttpModule,
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
