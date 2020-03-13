import { Module } from '@nestjs/common';
import { SmsActivationService } from './services/sms-activation.service';
import { CmsModule } from '../cms/cms.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsActivationEntity } from './entities/sms-activation.entity';

@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      SmsActivationEntity,
    ]),
  ],
  providers: [
    SmsActivationService,
  ],
  exports: [
    SmsActivationService,
  ],
})
export class SmsActivationModule {}
