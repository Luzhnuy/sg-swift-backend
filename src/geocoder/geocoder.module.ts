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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MapDistanceEntity,
      CustomersZipcodeEntity,
      MerchantsZipcodeEntity,
    ]),
    CmsModule,
    SettingsModule,
  ],
  controllers: [
    ZipcodesController,
  ],
  providers: [GeocoderService, GeocoderModuleService, GeocoderConfigService],
  exports: [GeocoderService],
})
export class GeocoderModule {
  constructor(
    private geocoderModuleService: GeocoderModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.geocoderModuleService.init();
  }
}
