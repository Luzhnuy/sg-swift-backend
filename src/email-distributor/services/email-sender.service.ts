import { Injectable } from '@nestjs/common';
import { EmailTemplates } from '../data/email-templates';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { SendGridService } from '@anchan828/nest-sendgrid';
import * as SendGridClient from '@sendgrid/client';
import { EmailLists } from '../data/email-lists';
import { SettingsService } from '../../settings/services/settings.service';

@Injectable()
export class EmailSenderService {

  private readonly fromEmail = 'support@SnapGrabDelivery.com';
  private readonly fromName = 'SnapGrab';

  constructor(
    private sendGrid: SendGridService,
    private settingsService: SettingsService,
  ) {
    this.settingsService
      .$inited
      .subscribe(() => {
        SendGridClient.setApiKey(this.settingsService.getValue(SettingsVariablesKeys.SendGridKey));
      });
  }

  async sendEmail(email: string, subject: string, text: string) {
    if (this.checkFacebookEmail(email)) {
      throw new Error(`Cannot send email to ${email}`);
    }
    try {
      await this.sendGrid.send({
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        text,
      });
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  async sendTemplateEmail(email: string, templateId: EmailTemplates, data: any) {
    if (this.checkFacebookEmail(email)) {
      throw new Error(`Cannot send email to ${email}`);
    }
    try {
      return await this.sendGrid.send({
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId,
        dynamicTemplateData: data,
      });
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  async sendEmailToNonCustomer(email: string, templateId: EmailTemplates, data: any) {
    try {
      await this.sendTemplateEmail(email, templateId, data);
      await this.addToNonCustomersList(email);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  async sendEmailToCustomer(email: string, templateId: EmailTemplates, data: any) {
    try {
      await this.sendTemplateEmail(email, templateId, data);
      await this.addToCustomersList(email);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  async sendEmailToMerchant(email: string, templateId: EmailTemplates, data: any) {
    try {
      await this.sendTemplateEmail(email, templateId, data);
      await this.addToMerchantsList(email);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  async addToCustomersList(email: string) {
    try {
      return this.addToList(email, EmailLists.customers);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  async addToNonCustomersList(email: string) {
    try {
      return this.addToList(email, EmailLists.nonCustomer);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  async addToMerchantsList(email: string) {
    try {
      return this.addToList(email, EmailLists.merchants);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  async addToList(email, listId) {
    try {
      let recipient = await this.getSendGridRecipient(email);
      if (!recipient) {
        recipient = await this.createSendGridRecipient(email);
      }
      const request: any = {};
      request.method = 'POST';
      request.url = `/v3/contactdb/lists/${listId}/recipients/${recipient.id}`;
      await SendGridClient.request(request);
      if (listId === EmailLists.customers) {
        request.qs = {
          list_id: listId,
          recipient_id: recipient.id,
        };
        request.method = 'DELETE';
        request.url = `/v3/contactdb/lists/${EmailLists.nonCustomer}/recipients/${recipient.id}`;
        await SendGridClient.request(request);
      }
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  private async createSendGridRecipient(email) {
    try {
      const request: any = {};
      request.body = [{ email }];
      request.method = 'POST';
      request.url = '/v3/contactdb/recipients';
      SendGridClient.setApiKey(this.settingsService.getValue(SettingsVariablesKeys.SendGridKey));
      const res = await SendGridClient.request(request);
      if (res[1].new_count) {
        return {
          id: res[1].persisted_recipients[0],
          email,
        };
      }
      return null;
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  private async getSendGridRecipient(email) {
    try {
      const request: any = {};
      const queryParams: any = {
        email,
      };
      request.qs = queryParams;
      request.method = 'GET';
      request.url = '/v3/contactdb/recipients/search';
      SendGridClient.setApiKey(this.settingsService.getValue(SettingsVariablesKeys.SendGridKey));
      const res = await SendGridClient.request(request);
      if (!res[1]) {
        console.error(res);
        throw new Error(`CANNOT CREATE RECIPIENT :: ${email}`);
      }
      const recipients: Array<{ id: string, email: string; }> = res[1].recipients;
      return recipients[0];
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  private checkFacebookEmail(email: string) {
    return email.endsWith('@facebook.com');
  }
}
