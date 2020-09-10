import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZipcodeEntity } from '../entities/zipcode.entity';
import { GeocoderService } from './geocoder.service';
import { timer } from 'rxjs';

@Injectable()
export class ZipcodesService {

  constructor(
    @InjectRepository(ZipcodeEntity)
    private readonly repository: Repository<ZipcodeEntity>,
    private geocoderService: GeocoderService,
  ) {

  }

  async getAll(
    limit: number,
    offset: number,
    countryCode?: string,
    region?: string,
    zipcode?: string,
  ) {
    const builder = await this.repository
      .createQueryBuilder('zipcode')
      // .select('zipcode.zipcode, region.code, region.countryCode')
      .innerJoin('zipcode.region', 'region', 'zipcode.regionId = region.id')
      .take(limit)
      .offset(offset);
    if (zipcode) {
      builder.andWhere('region.countryCode = :countryCode', { countryCode });
    }
    if (zipcode) {
      builder.andWhere('zipcode.zipcode = :zipcode', { zipcode });
    }
    if (region) {
      builder.andWhere('region.code = :code', { code: region });
    }
    const result = await builder.getMany();
    return result;
  }

  async getZipcode(zipcode: string, region: string, countryCode: string) {
    const builder = await this.repository
      .createQueryBuilder('zipcode')
      .innerJoin('region', 'region', 'zipcode.regionId = region.id')
      .where('zipcode.zipcode = :zipcode', { zipcode })
      .andWhere('region.countryCode = :countryCode', { countryCode })
      .andWhere('region.code = :code', { code: region });
    return builder.getOne();
  }

  async getZipcodeById(id: number) {
    return this.repository
      .findOne({ id });
  }

  async getZipcodeByZipcode(zipcode: string) {
    return this.repository
      .findOne({ zipcode });
  }

  async validateZipcode(country, region, zipcode) {
    const place = await this.geocoderService
      .getAutocompleteByCRZ(country, region, zipcode);
    if (place) {
      const placeCountry = this.geocoderService.getCountry(place);
      const placeRegion = this.geocoderService.getRegion(place);
      const placeZipcode = this.geocoderService.getShortZipcode(place);
      if (country === placeCountry && region === placeRegion && zipcode === placeZipcode) {
        return {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        };
      } else {
        throw new UnprocessableEntityException('Cannot detect zipcode');
      }
    }
    throw new UnprocessableEntityException('Cannot detect zipcode');
  }

  async calcDistanceBetweenZipcode(zipcode: ZipcodeEntity) {
    const builder = await this.repository
      .createQueryBuilder('zipcode')
      .select(['id', 'regionId', 'latitude', 'longitude',
        `( 6371 * acos ( cos ( radians(${ zipcode.latitude }) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(${ zipcode.longitude }) ) + sin ( radians(${ zipcode.latitude }) ) * sin( radians( latitude ) ) ) ) AS distance`,
      ])
      .where('id != :id', { id: zipcode.id }) // TODO map distances assoc doesn't not exists
      // .andWhere('') // TODO map distances assoc doesn't not exists
      .having('distance < 25');
    const zipcodes = await builder.getRawMany();
    return this.getDistances(zipcode, zipcodes);
  }

  async getDistances(source: ZipcodeEntity, destinations: ZipcodeEntity[]) {
    // tslint:disable-next-line:forin
    const result: Array<{
      source: number;
      destination: number;
      distance: number;
      duration: number;
    }> = [];
    for (const i in destinations) {
      const destination = destinations[i];
      await timer(500)
        .toPromise();
      let distResp = await this.geocoderService
        .getDistance(
          {
            lat: source.latitude,
            lon: source.longitude,
          }, {
            lat: destination.latitude,
            lon: destination.longitude,
          },
          true,
        );
      result.push({
        source: source.id,
        destination: destination.id,
        distance: distResp.distance,
        duration: distResp.duration,
      });
      await timer(500)
        .toPromise();
      distResp = await this.geocoderService
        .getDistance(
          {
            lat: destination.latitude,
            lon: destination.longitude,
          }, {
            lat: source.latitude,
            lon: source.longitude,
          },
          true,
        );
      result.push({
        source: destination.id,
        destination: source.id,
        distance: distResp.distance,
        duration: distResp.duration,
      });
    }
    return result;
  }

  saveZipcode(zipcode: ZipcodeEntity) {
    return this.repository
      .save(zipcode);
  }

  removeZipcode(zipcode: ZipcodeEntity) {
    return this.repository
      .remove(zipcode);
  }
}
