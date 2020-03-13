import { Entity, Column, JoinColumn, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { DriverProfileEntity } from './driver-profile.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';

// enum DriverStatus {
//   NoJobs = 'NoJobs',
//   Accepted = 'Accepted',
//   OnWay = 'OnWay',
// }

@Entity()
export class DriverStatusEntity extends ContentEntity {

  @OneToOne(type => DriverProfileEntity, driver => driver.status, {
    cascade: true,
  })
  profile: DriverProfileEntity;

  // @Column()
  // profileId: number;

  @Column({ default: false })
  isOnline: boolean;

  @Column('decimal', { precision: 12, scale: 8, default: null, nullable: true, transformer: ColumnNumericTransformer })
  latitude: null | number;

  @Column('decimal', { precision: 12, scale: 8, default: null, nullable: true, transformer: ColumnNumericTransformer })
  longitude: null | number;

  constructor(data?: Partial<DriverStatusEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }

  // @Column('text')
  // type: DriverStatus;
  //
  // @Column('varchar', { length: 80 })
  // email: string;
  //
  // @Column('varchar', { length: 16 })
  // phone: string;
  //
  // @Column('int', { default: 0 })
  // maxSimultaneousDelivery: number;

}
