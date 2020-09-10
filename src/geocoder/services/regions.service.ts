import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionEntity } from '../entities/region.entity';

@Injectable()
export class RegionsService {

  constructor(
    @InjectRepository(RegionEntity)
    private readonly repository: Repository<RegionEntity>,
  ) {

  }

  getSingle(options) {
    return this.repository
      .findOne(options);
  }

  async addIfNotExists(code, name, countryCode) {
    let region = await this.repository
      .findOne({ countryCode, code });
    if (region) {
      return;
    } else {
      region = new RegionEntity({
        countryCode,
        code,
        name,
      });
      return await this.repository
        .save(region);
    }
  }
}
