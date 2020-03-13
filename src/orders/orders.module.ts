import { HttpModule, MiddlewareConsumer, Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { CmsModule } from '../cms/cms.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrdersConfig } from './providers/orders-config';
import { OrdersModuleService } from './services/orders-module.service';
import { DriversModule } from '../drivers/drivers.module';
import { OrdersEventsGateway } from './orders-events.gateway';
import { OrdersService } from './services/orders.service';
import { OrderDeliveredToEntity } from './entities/order-delivered-to.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderMetadataEntity } from './entities/order-metadata.entity';
import { StripeModule, StripeOptions } from 'nestjs-stripe';
import { SharedModule } from '../shared/shared.module';
import { IOneSignalModuleOptions, OneSignalModule } from 'onesignal-api-client-nest';
import { SettingsModule } from '../settings/settings.module';
import { SettingsService } from '../settings/services/settings.service';
import { SettingsVariablesKeys } from '../settings/providers/settings-config';
import { Subject } from 'rxjs';
import { MerchantsModule } from '../merchants/merchants.module';
import { GeocoderModule } from '../geocoder/geocoder.module';
import { PaymentsModule } from '../payments/payments.module';
import { CustomersModule } from '../customers/customers.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { OrdersPushNotificationService } from './services/orders-push-notification.service';
import { OrdersEmailSenderService } from './services/orders-email-sender.service';
import { OrdersPriceCalculatorService } from './services/orders-price-calculator.service';
import { OrdersOldService } from './services/orders-old.service';
import { OrdersReportsService } from './services/orders-reports.service';

@Module({
  imports: [
    CmsModule,
    SettingsModule,
    StripeModule.forRootAsync({
      inject: [SettingsService],
      useFactory: (settingsService: SettingsService) => {
        const subj = new Subject<StripeOptions>();
        settingsService.$inited.subscribe(() => {
          subj.next({
            apiKey: settingsService.getValue(SettingsVariablesKeys.StripeKey),
          });
          subj.complete();
        });
        return subj.toPromise();
      },
    }),
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      OrderMetadataEntity,
      OrderDeliveredToEntity,
    ]),
    OneSignalModule.forRootAsync({
      inject: [SettingsService],
      useFactory: (settingsService: SettingsService) => {
        const subj = new Subject<IOneSignalModuleOptions>();
        settingsService.$inited.subscribe(() => {
          subj.next({
            appId: settingsService.getValue(SettingsVariablesKeys.OneSignalSnapGrabId),
            restApiKey: settingsService.getValue(SettingsVariablesKeys.OneSignalSnapGrabKey),
          });
          subj.complete();
        });
        return subj.toPromise();
      },
    }),
    DriversModule,
    MerchantsModule,
    CustomersModule,
    HttpModule,
    SharedModule,
    GeocoderModule,
    PaymentsModule,
    PromoCodesModule,
  ],
  controllers: [
    OrdersController,
  ],
  providers: [
    OrdersConfig,
    OrdersModuleService,
    OrdersEventsGateway,
    OrdersService,
    OrdersPushNotificationService,
    OrdersEmailSenderService,
    OrdersPriceCalculatorService,
    OrdersOldService,
    OrdersReportsService,
  ],
})
export class OrdersModule {

  constructor(
    private moduleService: OrdersModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.moduleService.init();
  }

}
