import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany, ManyToOne, Unique } from 'typeorm';
import { MapDistanceEntity } from './map-distance.entity';

@Entity()
@Unique(['zipcode'])
export class MerchantsZipcodeEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(type => MapDistanceEntity)
  @JoinColumn({ referencedColumnName: 'source', name: 'zipcode' })
  zipcodeMapDistance: MapDistanceEntity;

  @Column('varchar', { nullable: false, length: 3 })
  zipcode: string;

  constructor(data: Partial<MerchantsZipcodeEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
