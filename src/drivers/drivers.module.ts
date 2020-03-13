import { MiddlewareConsumer, Module } from '@nestjs/common';
import { DriversController } from './controllers/drivers.controller';
import { DriversModuleService } from './services/drivers-module.service';
import { CmsModule } from '../cms/cms.module';
import { DriversConfig } from './providers/drivers-config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverProfileEntity } from './entities/driver-profile.entity';
import { DriverStatusEntity } from './entities/driver-status.entity';
import { DriverStatusController } from './controllers/driver-status.controller';
import { DriversService } from './services/drivers.service';
import { DriversEventsGateway } from './drivers-events.gateway';
import { DriverOnlineEntity } from './entities/driver-online.entity';

@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([DriverProfileEntity, DriverStatusEntity, DriverOnlineEntity]),
  ],
  controllers: [DriversController, DriverStatusController],
  providers: [DriversConfig, DriversModuleService, DriversService, DriversEventsGateway],
  exports: [
    DriversService,
  ],
})
export class DriversModule {

  constructor(
    private moduleService: DriversModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.moduleService.init();
  }
}
