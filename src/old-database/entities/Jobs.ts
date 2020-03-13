import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('jobs', { database: 'snapgrab_prod' })
export class Jobs {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'reference', length: 100 })
  reference: string;

  @Column('varchar', { name: 'idgetswift', length: 200 })
  idgetswift: string;

  @Column('varchar', { name: 'currentStatus', length: 30 })
  currentStatus: string;

  @Column('varchar', { name: 'created', length: 100 })
  created: string;

  @Column('varchar', { name: 'pickupaddress', nullable: true, length: 255 })
  pickupaddress: string | null;

  @Column('varchar', { name: 'dropoffaddress', nullable: true, length: 255 })
  dropoffaddress: string | null;
}
