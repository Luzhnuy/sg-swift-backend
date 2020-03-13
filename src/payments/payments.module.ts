import { HttpModule, MiddlewareConsumer, Module } from '@nestjs/common';
import { PaymentCardsController } from './controllers/payment-cards.controller';
import { PaymentsModuleService } from './services/payments-module.service';
import { PaymentsConfigService } from './services/payments-config.service';
import { CmsModule } from '../cms/cms.module';
import { SettingsModule } from '../settings/settings.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentCardEntity } from './entities/payment-card.entity';
import { StripeModule, StripeOptions } from 'nestjs-stripe';
import { SettingsService } from '../settings/services/settings.service';
import { Subject } from 'rxjs';
import { SettingsVariablesKeys } from '../settings/providers/settings-config';
import { PaymentsStripeService } from './services/payments-stripe.service';
import { PaymentsPayPalService } from './services/payments-pay-pal.service';
import { PaymentsController } from './controllers/payments.controller';

@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      PaymentCardEntity,
    ]),
    HttpModule,
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
    SettingsModule,
  ],
  controllers: [
    PaymentCardsController,
    PaymentsController,
  ],
  providers: [
    PaymentsModuleService,
    PaymentsConfigService,
    PaymentsStripeService,
    PaymentsPayPalService,
  ],
  exports: [
    PaymentsStripeService,
    PaymentsPayPalService,
  ],
})
export class PaymentsModule {
  constructor(
    private module: PaymentsModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.module.init();
  }
}
