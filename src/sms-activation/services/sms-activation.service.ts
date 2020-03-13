import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { SmsActivationEntity } from '../entities/sms-activation.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { Twilio } from 'twilio';
import { SettingsService } from '../../settings/services/settings.service';

@Injectable()
export class SmsActivationService {

  constructor(
    @InjectRepository(SmsActivationEntity) protected readonly repository: Repository<SmsActivationEntity>,
    private settingsService: SettingsService,
  ) { }

  async createSmsActivation(userId: number) {
    const entity = new SmsActivationEntity({
      userId,
    });
    const oldEntity = await this.repository
      .findOne({
        userId,
      });
    if (oldEntity) {
      await this.repository.delete(oldEntity);
    }
    return await this.repository.save(entity);
  }

  async checkSmsActivation(userId: number, code: string) {
    const entity = await this.repository
      .findOne({
        userId,
        code,
      });
    if (entity) {
      await this.repository.delete(entity);
      return true;
    } else {
      return false;
    }
  }

  async sendVerificationSms({ phone, code, text, codeVariable }: {
    phone: string;
    code: string;
    text: string;
    codeVariable?: string;
  }) {
    const sid = this.settingsService.getValue(SettingsVariablesKeys.TwilioSid);
    const key = this.settingsService.getValue(SettingsVariablesKeys.TwilioKey);
    const from = this.settingsService.getValue(SettingsVariablesKeys.SMSPhone);
    let body: string;
    body = text.replace(codeVariable ? codeVariable : '__code__', code);
    const client = new Twilio(sid, key, {});
    try {
      await client.messages
        .create({
          body,
          from,
          to: phone,
        });
      return true;
    } catch (e) {
      if (e.message) {
        throw new UnprocessableEntityException(e.message);
      } else {
        throw e;
      }
    }
  }

}
