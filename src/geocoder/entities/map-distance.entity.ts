import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MapDistanceEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Index()
  @Column('varchar', { length: 3 })
  source: string;

  @Index()
  @Column('varchar', { length: 3 })
  destination: string;

  @Column('decimal', { precision: 5, scale: 3 })
  distance: number;

  @Column('tinyint')
  duration: number;

  constructor(data: Partial<MapDistanceEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
