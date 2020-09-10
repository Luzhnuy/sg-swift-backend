import {
  Controller, Get, Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionEntity } from '../entities/region.entity';

@Controller('regions')
export class RegionsController {

  constructor(@InjectRepository(RegionEntity) protected repository: Repository<RegionEntity>) { }

  @Get('')
  async loadRegions(@Query() query) {
    return this.repository.find();
  }
}
