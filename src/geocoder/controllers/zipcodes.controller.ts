import {
  BadRequestException,
  Body, ConflictException,
  Controller,
  Delete,
  Get, NotFoundException,
  Param,
  Post, Put, Query, UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MerchantsZipcodeEntity } from '../entities/merchants-zipcode.entity';
import { CustomersZipcodeEntity } from '../entities/customers-zipcode.entity';
import { PermissionsGuard } from '../../cms/roles-and-permissions/guards/permissions.guard';
import { GeocoderPermissionKeys } from '../services/geocoder-config.service';
import { MapDistanceEntity } from '../entities/map-distance.entity';
import { ZipcodesService } from '../services/zipcodes.service';
import { ZipcodeEntity } from '../entities/zipcode.entity';
import { RegionsService } from '../services/regions.service';
import { ZipcodesDistanceAssocEntity } from '../entities/zipcodes-distance-assoc.entity';
import { ZipcodeListType, ZipcodesListEntity } from '../entities/zipcodes-list.entity';

interface IZipcodeQuery {
  limit: number;
  offset: number;
  countryCode: string;
  region?: string;
  zipcode?: string;
}

@Controller('zipcodes')
export class ZipcodesController {

  constructor(
    @InjectRepository(MerchantsZipcodeEntity)
    protected readonly repositoryMerchants: Repository<MerchantsZipcodeEntity>,
    @InjectRepository(CustomersZipcodeEntity)
    protected readonly repositoryCustomers: Repository<CustomersZipcodeEntity>,
    @InjectRepository(MapDistanceEntity)
    protected readonly repositoryMapDistances: Repository<MapDistanceEntity>,
    @InjectRepository(ZipcodesDistanceAssocEntity)
    protected readonly repositoryZipcodesDistanceAssocEntity: Repository<ZipcodesDistanceAssocEntity>,
    @InjectRepository(ZipcodesListEntity)
    protected readonly repositoryLists: Repository<ZipcodesListEntity>,
    private zipcodesService: ZipcodesService,
    private regionsService: RegionsService,
  ) {}

  @Get('')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.ViewZipcodes))
  async getAllZipcodes(
    @Query() query: IZipcodeQuery,
  ) {
    query = this.validateViewZipcodesQuery(query);
    return this.zipcodesService
      .getAll(query.limit, query.offset, query.countryCode, query.region, query.zipcode);
  }

  @Post('')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.AddEditZipcode))
  async addZipcode(
    @Body() zipcode: Partial<ZipcodeEntity>,
  ) {
    if (zipcode.zipcode) {
      zipcode.zipcode = zipcode.zipcode.toUpperCase();
      const zipcodeExists = await this.zipcodesService
        .getZipcodeByZipcode(zipcode.zipcode);
      if (zipcodeExists) {
        throw new ConflictException('Zipcode already exists');
      }
    } else {
      throw new UnprocessableEntityException('Incorrect \'Zipcode\' param.');
    }
    if (!zipcode.regionId) {
      throw new UnprocessableEntityException('Incorrect \'regionId\' param.');
    }
    const region = await this.regionsService
      .getSingle({ id: zipcode.regionId });
    if (!region) {
      throw new UnprocessableEntityException('Incorrect \'regionId\' param.');
    }
    let newZipcode = new ZipcodeEntity({
      region,
      regionId: zipcode.regionId,
      zipcode: zipcode.zipcode,
    });
    try {
      await this.assignZipcodePosition(newZipcode);
      newZipcode = await this.zipcodesService
        .saveZipcode(newZipcode);
      const distances = await this.calcDistances(newZipcode);
      await this.repositoryZipcodesDistanceAssocEntity
        .save(distances.map(distance => {
          return new ZipcodesDistanceAssocEntity(distance);
        }));
      return newZipcode;
    } catch (e) {
      throw new UnprocessableEntityException(e.sqlMessage || e.message || e.toString());
    }
  }

  @Put(':id')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.AddEditZipcode))
  async editZipcode(
    @Param('id') id: string,
    @Body() zipcode: Partial<ZipcodeEntity>,
  ) {
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      throw new BadRequestException('Parameter \'id\' is incorrect');
    }
    let entity = await this.zipcodesService
      .getZipcodeById(idNum);
    if (!entity) {
      throw new NotFoundException('Zipcode not found');
    }
    let oldZipcode: string = null;
    if (zipcode.zipcode && zipcode.zipcode.toUpperCase() !== entity.zipcode) {
      zipcode.zipcode = zipcode.zipcode.toUpperCase();
      oldZipcode = entity.zipcode;
      entity.zipcode = zipcode.zipcode;
      const zipcodeExists = await this.zipcodesService
        .getZipcodeByZipcode(zipcode.zipcode);
      if (zipcodeExists && zipcodeExists.id !== entity.id) {
        throw new UnprocessableEntityException('Zipcode already exists');
      }
    }
    if (zipcode.regionId) {
      entity.regionId = zipcode.regionId;
    }
    const region = await this.regionsService
      .getSingle({ id: entity.regionId });
    if (!region) {
      throw new UnprocessableEntityException('Incorrect \'regionId\' param.');
    }
    entity.region = region;
    try {
      if (oldZipcode) {
        await this.assignZipcodePosition(entity);
        const builder = await this.repositoryZipcodesDistanceAssocEntity
          .createQueryBuilder('assoc')
          .where('assoc.source = :source', { source: entity.id })
          .orWhere('assoc.destination = :destination', { destination: entity.id });
        const assocs = await builder
          .getMany();
        await this.repositoryZipcodesDistanceAssocEntity
          .remove(assocs);
      }
      entity = await this.zipcodesService
        .saveZipcode(entity);
      entity.region = region;
      const distances = await this.calcDistances(entity);
      await this.repositoryZipcodesDistanceAssocEntity
        .save(distances.map(distance => {
          return new ZipcodesDistanceAssocEntity(distance);
        }));
      return entity;
    } catch (e) {
      throw new UnprocessableEntityException(e.sqlMessage || e.message || e.toString());
    }
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.RemoveZipcode))
  async removeZipcode(
    @Param('id') id: string,
  ) {
    const zipcode = await this.zipcodesService
      .getZipcodeById(parseInt(id, 10));
    if (!zipcode) {
      throw new NotFoundException('Zipcode not found');
    }
    return this.zipcodesService
      .removeZipcode(zipcode);
  }

  @Get('lists')
  async getAllZipcodesListsOld() {
    const customersList = await this.repositoryLists
      .createQueryBuilder('list')
      .innerJoinAndSelect('list.zipcodes', 'zipcodes')
      .where('list.type = :listType', { listType: ZipcodeListType.Customers })
      .getOne();
    const merchantsList = await this.repositoryLists
      .createQueryBuilder('list')
      .innerJoinAndSelect('list.zipcodes', 'zipcodes')
      .where('list.type = :listType', { listType: ZipcodeListType.Merchants })
      .getOne();
    // @ts-ignore
    return { customers: customersList.__zipcodes__, merchants: merchantsList.__zipcodes__ };
  }

  @Get('lists/new')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.ViewZipcodesLists))
  async getAllZipcodesLists() {
    return this.repositoryLists
      .find();
  }

  @Get('lists/:list')
  async getZipcodesList(@Param('list') listName: 'customers' | 'merchants') {
    const list = await this.repositoryLists
      .findOne({
        type: listName as any,
      });
    return list.zipcodes;
  }

  @Post('list/:list/zipcode/:id')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.AddZipcodeToList))
  async addZipcodeToList(
    @Param('list') listName: 'customers' | 'merchants',
    @Param('id') id: 'string',
  ) {
    const list = await this.repositoryLists
      .findOne({ type: listName as any });
    if (!list) {
      throw new UnprocessableEntityException('Invalid list name');
    }
    const zipcode = await this.zipcodesService
      .getZipcodeById(id as any);
    if (!list) {
      throw new UnprocessableEntityException('Invalid zipcode id');
    }
    await this.repositoryLists
      .createQueryBuilder('list')
      .relation('zipcodes')
      .of(list)
      .add(zipcode);
    return this.repositoryLists
      .findOne(list.id);
  }

  @Delete('list/:list/zipcode/:id')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.RemoveZipcodeFromList))
  async deleteZipcodeFromList(
    @Param('list') listName: 'customers' | 'merchants',
    @Param('id') id: string | number,
  ) {
    const list = await this.repositoryLists
      .findOne({ type: listName as any });
    if (!list) {
      throw new UnprocessableEntityException('Invalid list name');
    }
    const zipcode = await this.zipcodesService
      .getZipcodeById(id as any);
    if (!list) {
      throw new UnprocessableEntityException('Invalid zipcode id');
    }
    await this.repositoryLists
      .createQueryBuilder('list')
      .relation('zipcodes')
      .of(list)
      .remove(zipcode);
    return this.repositoryLists
      .findOne(list.id);
  }

  private validateViewZipcodesQuery(query: IZipcodeQuery) {
    query = Object.assign({
      limit: 200,
      offset: 0,
    }, query);
    if (/^\d+$/.test(query.limit.toString()) || query.limit > 200) {
      query.limit = 200;
    }
    if (/^\d+$/.test(query.offset.toString())) {
      query.offset = 0;
    }
    return query;
  }

  private async assignZipcodePosition(zipcode: ZipcodeEntity) {
    const coords: {
      latitude: number;
      longitude: number;
    } = await this.zipcodesService
      .validateZipcode('Canada', zipcode.region.code, zipcode.zipcode);
    zipcode.latitude = coords.latitude;
    zipcode.longitude = coords.longitude;
  }

  private async calcDistances(zipcode: ZipcodeEntity) {
    return this.zipcodesService
      .calcDistanceBetweenZipcode(zipcode);
  }
}
