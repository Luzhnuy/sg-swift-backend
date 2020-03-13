import { Injectable } from '@nestjs/common';
import { PromoCodeEntity } from './entities/promo-code.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PromoCodesService {

  constructor(
    @InjectRepository(PromoCodeEntity) protected readonly repository: Repository<PromoCodeEntity>,
  ) {}

  getByCode(code: string) {
    return this.repository.findOne({ code });
  }

  async removeByCode(code: string) {
    const promoCode = await this.repository.findOne({ code });
    if (!promoCode) {
      return false;
    }
    await this.repository.remove(promoCode);
    return true;
  }

}
