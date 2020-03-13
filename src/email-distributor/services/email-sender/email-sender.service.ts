import { Injectable } from '@nestjs/common';
import { EmailTemplates } from '../../data/email-templates';

@Injectable()
export class EmailSenderService {

  sendEmail(template: EmailTemplates, data: any) {
    // TODO send email
  }
}
