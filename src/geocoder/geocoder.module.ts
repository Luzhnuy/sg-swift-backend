import { MiddlewareConsumer, Module } from '@nestjs/common';
import { GeocoderService } from './services/geocoder.service';
import { SettingsModule } from '../settings/settings.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapDistanceEntity } from './entities/map-distance.entity';
import { GeocoderModuleService } from './services/geocoder-module.service';
import { ZipcodesController } from './controllers/zipcodes.controller';
import { CustomersZipcodeEntity } from './entities/customers-zipcode.entity';
import { MerchantsZipcodeEntity } from './entities/merchants-zipcode.entity';
import { GeocoderConfigService } from './services/geocoder-config.service';
import { CmsModule } from '../cms/cms.module';
import { ZipcodesService } from './services/zipcodes.service';
import { ZipcodeEntity } from './entities/zipcode.entity';
import { RegionsController } from './controllers/regions.controller';
import { RegionEntity } from './entities/region.entity';
import { RegionsService } from './services/regions.service';
import { ZipcodesDistanceAssocEntity } from './entities/zipcodes-distance-assoc.entity';
import { ZipcodesListEntity } from './entities/zipcodes-list.entity';
import { DistancesController } from './controllers/distances.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MapDistanceEntity,
      CustomersZipcodeEntity,
      MerchantsZipcodeEntity,

      RegionEntity,
      ZipcodeEntity,
      ZipcodesDistanceAssocEntity,
      ZipcodesListEntity,
    ]),
    CmsModule,
    SettingsModule,
  ],
  controllers: [
    ZipcodesController,
    RegionsController,
    DistancesController,
  ],
  providers: [
    GeocoderService,
    GeocoderModuleService,
    GeocoderConfigService,
    RegionsService,
    ZipcodesService,
  ],
  exports: [
    GeocoderService,
    ZipcodesService,
  ],
})
export class GeocoderModule {
  constructor(
    private geocoderModuleService: GeocoderModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.geocoderModuleService.init();
  }
}
