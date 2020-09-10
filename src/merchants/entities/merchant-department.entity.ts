import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';
import { MerchantEntity } from './merchant.entity';
import { MapDistanceEntity } from '../../geocoder/entities/map-distance.entity';
import { ZipcodeEntity } from '../../geocoder/entities/zipcode.entity';
import { ZipcodesDistanceAssocEntity } from '../../geocoder/entities/zipcodes-distance-assoc.entity';

@Entity()
export class MerchantDepartmentEntity extends ContentEntity {

  @ManyToOne(type => MerchantEntity, {
    lazy: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  merchant: MerchantEntity;

  @Column()
  merchantId: number;

  @Column('varchar', { nullable: true, default: null, length: 2 })
  countryCode: string;

  @Column('text', { nullable: true, default: null })
  country: string;

  @Column('text', { nullable: true, default: null })
  region: string;

  @Column('text', { nullable: true, default: null })
  city: string;

  @Column('text', { nullable: true, default: null })
  street: string;

  // @ManyToOne(type => MapDistanceEntity)
  // @JoinColumn({ referencedColumnName: 'source', name: 'zipcode' })
  // zipcodeMapDistance: MapDistanceEntity;

  @Column('varchar', { nullable: true, default: null, length: 3 })
  zipcode: string;

  @ManyToOne(type => ZipcodeEntity)
  @JoinColumn()
  zipcodeEntity: ZipcodeEntity;

  @Column({
    nullable: true,
    default: null,
  })
  zipcodeEntityId: number;

  @Column('text', { nullable: true, default: null })
  building: string;

  @Column('text', { nullable: true, default: null })
  apartments: string;

  @Column('text', { nullable: true, default: null })
  address: string;

  @Column('decimal', { precision: 12, scale: 8, default: null, nullable: true, transformer: ColumnNumericTransformer })
  latitude: number;

  @Column('decimal', { precision: 12, scale: 8, default: null, nullable: true, transformer: ColumnNumericTransformer })
  longitude: number;

  @Column('boolean', { default: false })
  isMain: boolean;

  @Column('smallint', { default: 10 * 60 })
  openHours: number;

  @Column('smallint', { default: 22 * 60 })
  closeHours: number;

  @Column('varchar', { length: 32, default: 'America/Montreal' })
  timezone: string;

  timezoneOffset?: number;

  constructor(data: Partial<MerchantDepartmentEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
