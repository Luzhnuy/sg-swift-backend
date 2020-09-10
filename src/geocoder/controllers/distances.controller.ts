import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZipcodesDistanceAssocEntity } from '../entities/zipcodes-distance-assoc.entity';
import { Repository } from 'typeorm';
import { PermissionsGuard } from '../../cms/roles-and-permissions/guards/permissions.guard';
import { GeocoderPermissionKeys } from '../services/geocoder-config.service';
import { ZipcodesService } from '../services/zipcodes.service';

@Controller('zipcodes/distances')
export class DistancesController {

  constructor(
    @InjectRepository(ZipcodesDistanceAssocEntity)
    protected readonly repository: Repository<ZipcodesDistanceAssocEntity>,
    private zipcodesService: ZipcodesService,
  ) {
  }

  @Get('')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.ViewZipcodes))
  getZipcodeDistances(
    @Query('zipcode') zipcodeId: string,
  ) {
    return this.repository
      .createQueryBuilder('assoc')
      .where('assoc.source = :zipcodeId', { zipcodeId })
      .getMany();
  }

  @Post('')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.AddEditZipcode))
  async addZipcodeDistances(
    @Body() data: Partial<ZipcodesDistanceAssocEntity>,
  ) {
    const zda = new ZipcodesDistanceAssocEntity(data);
    if (
      zda.source.toString() !== data.source.toString()
      || zda.destination.toString() !== data.destination.toString()
    ) {
      await this.checkIfAssocExists(data.source, data.destination);
    }
    return this.repository
      .save(zda);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.AddEditZipcode))
  async updateZipcodeDistances(
    @Param('id') id: string,
    @Body() data: Partial<ZipcodesDistanceAssocEntity>,
  ) {
    const zda = await this.repository
      .findOne(id);
    if (
      zda.source.toString() !== data.source.toString()
      || zda.destination.toString() !== data.destination.toString()
    ) {
      await this.checkIfAssocExists(data.source, data.destination);
    }
    if (!zda) {
      throw new UnprocessableEntityException('Incorrect param \'id\'.');
    }
    if (data.distance) {
      zda.distance = data.distance;
    }
    if (data.duration) {
      zda.duration = data.duration;
    }
    if (data.source) {
      zda.source = data.source;
    }
    if (data.destination) {
      zda.destination = data.destination;
    }
    return this.repository
      .save(zda);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.RemoveZipcode))
  async removeZipcodeDistances(
    @Param('id') id: string,
  ) {
    const zda = await this.repository
      .findOne(id);
    if (!zda) {
      throw new UnprocessableEntityException('Incorrect param \'id\'.');
    }
    return this.repository
      .remove(zda);
  }

  @Get('calc/:source/:destination')
  @UseGuards(PermissionsGuard(() => GeocoderPermissionKeys.AddEditZipcode))
  async calcDistancesAndDuration(
    @Param('source') source: string,
    @Param('destination') destination: string,
  ) {
    const sourceZipcode = await this.zipcodesService
      .getZipcodeById(parseInt(source, 10));
    if (!sourceZipcode) {
      throw new UnprocessableEntityException('Invalid param \'source\'.');
    }
    const destinationZipcode = await this.zipcodesService
      .getZipcodeById(parseInt(destination, 10));
    if (!destinationZipcode) {
      throw new UnprocessableEntityException('Invalid param \'destination\'.');
    }
    const distances = await this.zipcodesService
      .getDistances(sourceZipcode, [ destinationZipcode ]);
    if (!distances.length) {
      throw new UnprocessableEntityException('Zipcode cannot be found');
    }
    return distances[0];
  }

  private async checkIfAssocExists(source: number, destination: number) {
    const count = await this.repository
      .count({ source, destination });
    if (count) {
      throw new UnprocessableEntityException('Such combination already exists.');
    }
  }
}
