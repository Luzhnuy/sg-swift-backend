import { Module } from '@nestjs/common';
import { DbMigrationsService } from './db-migrations.service';
import { SharedModule } from '../shared/shared.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { OrdersModule } from '../orders/orders.module';
import { GeocoderModule } from '../geocoder/geocoder.module';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { MapDistanceEntity } from '../geocoder/entities/map-distance.entity';
import { ZipcodesDistanceAssocEntity } from '../geocoder/entities/zipcodes-distance-assoc.entity';
import { ZipcodeEntity } from '../geocoder/entities/zipcode.entity';
import { RegionEntity } from '../geocoder/entities/region.entity';
import { ZipcodesListEntity } from '../geocoder/entities/zipcodes-list.entity';
import { MerchantsZipcodeEntity } from '../geocoder/entities/merchants-zipcode.entity';
import { CustomersZipcodeEntity } from '../geocoder/entities/customers-zipcode.entity';
import { MerchantDepartmentEntity } from '../merchants/entities/merchant-department.entity';
import { DbMigrationsController } from './db-migrations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MapDistanceEntity,
      ZipcodesDistanceAssocEntity,
      ZipcodeEntity,
      RegionEntity,
      ZipcodesListEntity,
      MerchantsZipcodeEntity,
      CustomersZipcodeEntity,
      MerchantDepartmentEntity,
    ]),
    SharedModule,
    MerchantsModule,
    OrdersModule,
    GeocoderModule,
  ],
  controllers: [
    DbMigrationsController,
  ],
  providers: [
    DbMigrationsService,
  ],
})
export class DbMigrationsModule {}
