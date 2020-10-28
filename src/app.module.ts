import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsModule } from './cms/cms.module';
import { DriversModule } from './drivers/drivers.module';
import { OrdersModule } from './orders/orders.module';
import { UiModule } from './ui/ui.module';
import { SharedModule } from './shared/shared.module';
import { SettingsModule } from './settings/settings.module';
import { MerchantsModule } from './merchants/merchants.module';
import { SnapGrabAppModule } from './snap-grab-app/snap-grab-app.module';
import { PaymentsModule } from './payments/payments.module';
import { GeocoderModule } from './geocoder/geocoder.module';
import { SmsActivationModule } from './sms-activation/sms-activation.module';
import { CustomersModule } from './customers/customers.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
// import { OldDatabaseModule } from './old-database/old-database.module';
import { Environment } from './environment';
import { SendGridModule, SendGridModuleOptions } from '@anchan828/nest-sendgrid';
import { SettingsService } from './settings/services/settings.service';
import { Subject } from 'rxjs';
import { SettingsVariablesKeys } from './settings/providers/settings-config';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ApiV1Module } from './api-v1/api-v1.module';
import { DbMigrationsModule } from './db-migrations/db-migrations.module';
// import { DistancesController } from './geocoder/controllers/distances.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: Environment.mysql.type,
      host: Environment.mysql.host,
      port: Environment.mysql.port,
      username: Environment.mysql.username,
      password: Environment.mysql.password,
      database: Environment.mysql.database,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: Environment.mysql.synchronize,
      charset: Environment.mysql.charset,
      logging: Environment.mysql.logging,
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
    SnapGrabAppModule,
    PaymentsModule,
    GeocoderModule,
    SmsActivationModule,
    CustomersModule,
    PromoCodesModule,
    // OldDatabaseModule,
    SchedulerModule,
    ApiV1Module,
    DbMigrationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
