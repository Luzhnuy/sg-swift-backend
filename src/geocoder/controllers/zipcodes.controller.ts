import {
  Body,
  Controller,
  Delete,
  Get, NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MerchantsZipcodeEntity } from '../entities/merchants-zipcode.entity';
import { CustomersZipcodeEntity } from '../entities/customers-zipcode.entity';
import { PermissionsGuard } from '../../cms/roles-and-permissions/guards/permissions.guard';
import { GeocoderPermissionKeys } from '../services/geocoder-config.service';
import { MapDistanceEntity } from '../entities/map-distance.entity';

@Controller('zipcodes')
export class ZipcodesController {

  private readonly customersZipcodes = ['H2G', 'H3J', 'H3Z', 'H3H', 'H3V', 'H3T', 'H2V', 'H3G', 'H3A',
    'H3B', 'H2Z', 'H2Y', 'H2X', 'H2W', 'H2T', 'H2J', 'H2L', 'H2H', 'H5B', 'H4Z', 'H5A', 'H3C',
    'H4C', 'H3P', 'H3R', 'H2S', 'H3K', 'H3S', 'H3X', 'H3Y',
    'H4G', 'H4A', 'H4E', 'H3E',
  ];

  private merchantsZipcodes = ['H2G', 'H3J', 'H3Z', 'H3H', 'H3V', 'H3T', 'H2V', 'H3G', 'H3A',
    'H3B', 'H2Z', 'H2Y', 'H2X', 'H2W', 'H2T', 'H2J', 'H2L', 'H2H', 'H5B', 'H4Z', 'H5A', 'H3C',
    'H4C', 'H1Y', 'H1V', 'H1W', 'H1X', 'H4B', 'H2K', 'H3P', 'H4V', 'H3R', 'H2S', 'H3K',
    'H3S', 'H3X', 'H3Y', 'H4G', 'H4A', 'H4E', 'H3W',

    'J4H', 'J4G', 'J4R', 'J4S', 'J4W', 'J4X', 'J4P', 'H2N', 'H2P', 'H2R',
    'H1A', 'H1B', 'H1C', 'H1E', 'H1G', 'H1H', 'H1J', 'H1K', 'H1M', 'H1L', 'H1N', 'H1P', 'H1R',
    'H1S', 'H1T', 'H1Z', 'H2A', 'H2B', 'H2C', 'H2E', 'H2M', 'H3E', 'H3L', 'H3M', 'H3N', 'H4H',
    'H4J', 'H4K', 'H4L', 'H4M', 'H4N', 'H4P', 'H4R', 'H4S', 'H4T', 'H4W', 'H4X', 'H4Y',
    'H8N', 'H8P', 'H8R', 'H8S', 'H8T', 'H8Y', 'H8Z', 'H9A', 'H9B', 'H9C', 'H9E', 'H9G', 'H9H',
    'H9J', 'H9K', 'H9P', 'H9R', 'H9S', 'H9W', 'H9X',
  ];

  constructor(
    @InjectRepository(MerchantsZipcodeEntity)
    protected readonly repositoryMerchants: Repository<MerchantsZipcodeEntity>,
    @InjectRepository(CustomersZipcodeEntity)
    protected readonly repositoryCustomers: Repository<CustomersZipcodeEntity>,
    @InjectRepository(MapDistanceEntity)
    protected readonly repositoryMapDistances: Repository<MapDistanceEntity>,
  ) {}

  @Get('insert-default-zipcodes')
  async insertDefaultZipcodes() {
    this.merchantsZipcodes
      .forEach(zipcode => {
        this.repositoryMerchants
          .save(new MerchantsZipcodeEntity({ zipcode }));
      });
    this.customersZipcodes
      .forEach(zipcode => {
        this.repositoryCustomers
          .save(new CustomersZipcodeEntity({ zipcode }));
      });
  }

  @Get('')
  async getAllZipcodes() {
    const zipcodes = await this.repositoryMapDistances
      .createQueryBuilder('distance')
      .select('DISTINCT(distance.source)')
      .getRawMany();
    return zipcodes.map(({source}) => source);
  }

  @Get('lists')
  async getAllZipcodesLists() {
    const customersZipcodes = await this.repositoryCustomers.find();
    const merchantsZipcodes = await this.repositoryMerchants.find();
    return { customers: customersZipcodes, merchants: merchantsZipcodes };
  }

  @Get('lists/:list')
  async getZipcodesList(@Param('list') listName: 'customers' | 'merchants') {
    switch (listName) {
      case 'customers':
        return await this.repositoryCustomers.find();
      case 'merchants':
        return await await this.repositoryMerchants.find();
      default:
        throw new NotFoundException('List not found');
    }
  }

  @Post('lists/:list/zipcodes')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.AddZipcodeToList))
  async addZipcodeToList(
    @Param('list') listName: 'customers' | 'merchants',
    @Body() { zipcode }: { zipcode: string },
    ) {
    let zipcodeEntity;
    switch (listName) {
      case 'customers':
        zipcodeEntity = new CustomersZipcodeEntity({ zipcode });
        return await this.repositoryCustomers.save(zipcodeEntity);
      case 'merchants':
        zipcodeEntity = new MerchantsZipcodeEntity({ zipcode });
        return await await this.repositoryMerchants.save(zipcodeEntity);
      default:
        throw new NotFoundException('List not found');
    }
  }

  @Delete('lists/:list/zipcodes/:id')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.RemoveZipcodeFromList))
  async deleteZipcodeFromList(
    @Param('list') listName: 'customers' | 'merchants',
    @Param('id') id: string | number,
  ) {
    id = parseInt(id.toString(), 10);
    let entity;
    switch (listName) {
      case 'customers':
        entity = await this.repositoryCustomers.findOne({ id });
        return await this.repositoryCustomers.remove(entity);
      case 'merchants':
        entity = await this.repositoryMerchants.findOne({ id });
        return await this.repositoryMerchants.remove(entity);
      default:
        throw new NotFoundException('List not found');
    }
  }
}
