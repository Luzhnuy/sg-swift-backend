import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('mapdistances', { database: 'snapgrab_prod' })
export class Mapdistances {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'source', length: 10 })
  source: string;

  @Column('varchar', { name: 'destination', length: 10 })
  destination: string;

  @Column('varchar', { name: 'distance', length: 10 })
  distance: string;

  @Column('varchar', { name: 'duration', length: 50 })
  duration: string;
}
