import { Module } from '@nestjs/common';
import { GeocoderService } from './services/geocoder.service';
import { SettingsModule } from '../settings/settings.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapDistanceEntity } from './entities/map-distance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MapDistanceEntity,
    ]),
    SettingsModule,
  ],
  providers: [GeocoderService],
  exports: [GeocoderService],
})
export class GeocoderModule {}
