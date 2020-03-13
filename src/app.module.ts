import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsModule } from './cms/cms.module';
import { DriversModule } from './drivers/drivers.module';
import { OrdersModule } from './orders/orders.module';
import { UiModule } from './ui/ui.module';
import { SharedModule } from './shared/shared.module';
import { SendGridModule, SendGridModuleOptions } from '@anchan828/nest-sendgrid';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SettingsModule } from './settings/settings.module';
import { SettingsService } from './settings/services/settings.service';
import { Subject } from 'rxjs';
import { SettingsVariablesKeys } from './settings/providers/settings-config';
import { MerchantsModule } from './merchants/merchants.module';
import { EmailDistributorModule } from './email-distributor/email-distributor.module';
import { SnapGrabAppModule } from './snap-grab-app/snap-grab-app.module';
import { PaymentsModule } from './payments/payments.module';
import { GeocoderModule } from './geocoder/geocoder.module';
import { SmsActivationModule } from './sms-activation/sms-activation.module';
import { CustomersModule } from './customers/customers.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { OldDatabaseModule } from './old-database/old-database.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      // rootPath: join(__dirname, '..', 'uploads'),
      rootPath: join(__dirname, '..'),
      serveStaticOptions: {
        index: false,
      },
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'username',
      password: 'password',
      database: 'database_name',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      charset: 'utf8mb4_unicode_ci',
      logging: false,
    }),
    SendGridModule.forRootAsync({
      inject: [SettingsService],
      useFactory: (settingsService: SettingsService) => {
        const subj = new Subject<SendGridModuleOptions>();
        settingsService.$inited.subscribe(() => {
          subj.next({
            apikey: settingsService.getValue(SettingsVariablesKeys.SendGridKey),
          });
          subj.complete();
        });
        return subj.toPromise();
      },
    }),
    CmsModule,
    SettingsModule,
    MerchantsModule,
    DriversModule,
    OrdersModule,
    UiModule,
    SharedModule,
    EmailDistributorModule,
    SnapGrabAppModule,
    PaymentsModule,
    GeocoderModule,
    SmsActivationModule,
    CustomersModule,
    PromoCodesModule,
    OldDatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
