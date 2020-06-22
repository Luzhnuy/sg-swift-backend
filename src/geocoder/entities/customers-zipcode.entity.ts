import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany, ManyToOne } from 'typeorm';
import { MapDistanceEntity } from './map-distance.entity';

@Entity()
export class AppZipcodesEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(type => MapDistanceEntity)
  @JoinColumn({ referencedColumnName: 'source', name: 'zipcode' })
  zipcodeMapDistance: MapDistanceEntity;

  @Column('varchar', { nullable: false, length: 3 })
  zipcode: string;

  constructor(data: Partial<MapDistanceEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
