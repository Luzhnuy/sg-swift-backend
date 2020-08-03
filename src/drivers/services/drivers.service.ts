import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverProfileEntity } from '../entities/driver-profile.entity';
import { DriverStatusEntity } from '../entities/driver-status.entity';

@Injectable()
export class DriversService {

  private $$driversProfilesUpdates = new Subject<Partial<DriverProfileEntity>>();
  public $driversProfilesUpdates = this.$$driversProfilesUpdates.asObservable();

  private $$driverStatusesUpdates = new Subject<Partial<DriverStatusEntity>>();
  public $driverStatusesUpdates = this.$$driverStatusesUpdates.asObservable();

  constructor(
    @InjectRepository(DriverProfileEntity) private readonly repository: Repository<DriverProfileEntity>,
    @InjectRepository(DriverStatusEntity) private readonly repositoryDriverStatus: Repository<DriverStatusEntity>,
  ) {}

  emitDriverUpdate(driver: Partial<DriverProfileEntity>) {
    this.$$driversProfilesUpdates.next(driver);
  }

  emitDriverStatusUpdate(status: Partial<DriverStatusEntity>) {
    this.$$driverStatusesUpdates.next(status);
  }

  getSingle(id) {
    return this.repository.findOne({ id });
  }

}
