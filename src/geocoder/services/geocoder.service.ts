import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/services/settings.service';
import { createClient, GeocodingResult, GoogleMapsClient, LatLngLiteral, PlaceDetailsResult } from '@google/maps';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { InjectRepository } from '@nestjs/typeorm';
import { MapDistanceEntity } from '../entities/map-distance.entity';
import { Repository } from 'typeorm';
import { MerchantsZipcodeEntity } from '../entities/merchants-zipcode.entity';

@Injectable()
export class GeocoderService {

  private client: GoogleMapsClient;

  constructor(
    @InjectRepository(MapDistanceEntity)
    private readonly repository: Repository<MapDistanceEntity>,
    @InjectRepository(MerchantsZipcodeEntity)
    protected readonly repositoryMerchants: Repository<MerchantsZipcodeEntity>,
    private settingsService: SettingsService,
  ) {
    this.settingsService
      .$inited
      .subscribe(() => {
        const key = this.settingsService.getValue(SettingsVariablesKeys.GoogleMapsApiKey);
        this.client = createClient({ key, Promise });
      });
    // TODO upload map-distances
  }

  async checkMerchantsZipcodePresents(zipcode: string) {
    const count = await this.repositoryMerchants
      .count({
        zipcode,
      });
    return !!count;
  }

  async getDistance(origin, destination) {
    const params = {
      origin: {
        lat: origin.lat,
        lng: origin.lon,
      },
      destination: {
        lat: destination.lat,
        lng: destination.lon,
      },
    };
    // const resp = await this.client.directions(params).asPromise();
    const resp = await this.client.directions(params).asPromise();
    if (resp.json.routes.length) {
      return resp.json.routes[0].legs.reduce((res, leg) => {
        return res + leg.distance.value;
      }, 0);
    } else {
      return -1;
    }
  }

  async getGeocodeAddress(addr: string) {
    const geocode = await this.client.geocode({
      address: addr,
    }).asPromise();
    if (geocode.json.results.length) {
      return geocode.json.results[0];
    } else {
      return false;
    }
  }

  async getAddress(addr: string) {
    const resp = await this.client.findPlace({
      input: addr,
      inputtype: 'textquery',
    }).asPromise();
    if (resp.json.candidates.length) {
      const placeId =  resp.json.candidates[0].place_id;
      const place = await this.client.place({
        placeid: placeId,
      }).asPromise();
      return place.json.result;
    }
    return false;
  }

  getZipcode(addr: PlaceDetailsResult | GeocodingResult): string {
    const zipcodeCmp = addr.address_components.find(ac => {
      return ac.types.indexOf('postal_code') > -1;
    });
    if (zipcodeCmp) {
      return zipcodeCmp.short_name.toUpperCase();
    }
    return '';
  }

  getShortZipcode(addr: PlaceDetailsResult | GeocodingResult): string {
    const zipcode = this.getZipcode(addr);
    return zipcode.substr(0, 3);
  }

  getCountryCode(addr: PlaceDetailsResult | GeocodingResult): string {
    const countryCmp = addr.address_components.find(ac => {
      return ac.types.indexOf('country') > -1;
    });
    if (countryCmp) {
      return countryCmp.short_name.toUpperCase();
    }
    return '';
  }

  getCountry(addr: PlaceDetailsResult | GeocodingResult): string {
    const countryCmp = addr.address_components.find(ac => {
      return ac.types.indexOf('country') > -1;
    });
    if (countryCmp) {
      return countryCmp.long_name;
    }
    return '';
  }

  getCity(addr: PlaceDetailsResult | GeocodingResult): string {
    const countryCmp = addr.address_components.find(ac => {
      return ac.types.indexOf('locality') > -1;
    });
    if (countryCmp) {
      return countryCmp.long_name;
    }
    return '';
  }

  getRegion(addr: PlaceDetailsResult | GeocodingResult): string {
    const countryCmp = addr.address_components.find(ac => {
      return ac.types.indexOf('administrative_area_level_1') > -1;
    });
    if (countryCmp) {
      return countryCmp.short_name.toUpperCase();
    }
    return '';
  }

  getStreet(addr: PlaceDetailsResult | GeocodingResult): string {
    const countryCmp = addr.address_components.find(ac => {
      return ac.types.indexOf('route') > -1;
    });
    if (countryCmp) {
      return countryCmp.short_name.toUpperCase();
    }
    return '';
  }

  getStreetNumber(addr: PlaceDetailsResult | GeocodingResult): string {
    const countryCmp = addr.address_components.find(ac => {
      return ac.types.indexOf('street_number') > -1;
    });
    if (countryCmp) {
      return countryCmp.short_name.toUpperCase();
    }
    return '';
  }
}
