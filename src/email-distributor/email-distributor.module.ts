import { Module } from '@nestjs/common';
import { EmailSenderService } from './services/email-sender/email-sender.service';

@Module({
  providers: [EmailSenderService],
  exports: [EmailSenderService],
})
export class EmailDistributorModule {}
