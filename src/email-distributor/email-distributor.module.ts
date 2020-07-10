import { Module } from '@nestjs/common';
import { EmailSenderService } from './services/email-sender.service';
import { SettingsModule } from '../settings/settings.module';
import { SendGridModule, SendGridModuleOptions } from '@anchan828/nest-sendgrid';
import { SettingsService } from '../settings/services/settings.service';
import { Subject } from 'rxjs';
import { SettingsVariablesKeys } from '../settings/providers/settings-config';

@Module({
  imports: [
    SettingsModule,
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
  ],
  providers: [EmailSenderService],
  exports: [EmailSenderService],
})
export class EmailDistributorModule {}
