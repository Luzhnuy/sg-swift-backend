import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne, Unique, ManyToMany, OneToMany } from 'typeorm';
import { RegionEntity } from './region.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';
import { MapDistanceEntity } from './map-distance.entity';
import { ZipcodeEntity } from './zipcode.entity';
import { MerchantDepartmentEntity } from '../../merchants/entities/merchant-department.entity';

@Entity()
@Unique(['source', 'destination'])
export class ZipcodesDistanceAssocEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(type => ZipcodeEntity, {
    onDelete: 'CASCADE',
    lazy: true,
    nullable: false,
  })
  @JoinColumn({ referencedColumnName: 'id', name: 'source' })
  sourceZipcode: ZipcodeEntity;

  @Column('integer', { nullable: false })
  source: number;

  @ManyToOne(type => ZipcodeEntity, {
    onDelete: 'CASCADE',
    lazy: true,
    nullable: false,
  })
  @JoinColumn({ referencedColumnName: 'id', name: 'destination' })
  destinationZipcode: ZipcodeEntity;

  @Column('integer', { nullable: false })
  destination: number;

  @Column('integer', { nullable: false, comment: 'in meters' })
  distance: number;

  @Column('integer', { nullable: false, comment: 'in seconds' })
  duration: number;

  constructor(data: Partial<ZipcodesDistanceAssocEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
