import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('getswiftId', ['getswiftid'], {})
@Index('jobid', ['reference'], {})
@Entity('orders_info', { database: 'snapgrab_prod' })
export class OrdersInfo {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'getswiftid', nullable: true, length: 40 })
  getswiftid: string | null;

  @Column('varchar', { name: 'reference', length: 40 })
  reference: string;

  @Column('varchar', { name: 'dropoffname', length: 255 })
  dropoffname: string;

  @Column('varchar', { name: 'dropoffaddress', length: 255 })
  dropoffaddress: string;

  @Column('varchar', { name: 'dropoffphone', length: 20 })
  dropoffphone: string;

  @Column('float', { name: 'distance', nullable: true, precision: 12 })
  distance: number | null;

  @Column('varchar', { name: 'drivername', nullable: true, length: 255 })
  drivername: string | null;

  @Column('varchar', { name: 'driverphone', nullable: true, length: 20 })
  driverphone: string | null;

  @Column('text', { name: 'instructions', nullable: true })
  instructions: string | null;

  @Column('int', { name: 'bringback', default: () => '"0"' })
  bringback: number;

  @Column('int', { name: 'largeorder', default: () => '"0"' })
  largeorder: number;

  @Column('datetime', { name: 'deliverytime', nullable: true })
  deliverytime: Date | null;

  @Column('datetime', { name: 'created', default: () => 'CURRENT_TIMESTAMP' })
  created: Date;

  @Column('datetime', { name: 'updated', default: () => 'CURRENT_TIMESTAMP' })
  updated: Date;

  @Column('varchar', {
    name: 'status',
    length: 10,
    default: () => '"Received"',
  })
  status: string;

  @Column('text', { name: 'items', nullable: true })
  items: string | null;

  @Column('float', { name: 'deliveryfee', nullable: true, precision: 12 })
  deliveryfee: number | null;

  @Column('varchar', { name: 'trackingurlwww', nullable: true, length: 255 })
  trackingurlwww: string | null;

  @Column('varchar', { name: 'trackingurlapi', nullable: true, length: 255 })
  trackingurlapi: string | null;

  @Column('varchar', { name: 'pickupaddress', nullable: true, length: 255 })
  pickupaddress: string | null;

  @Column('varchar', { name: 'pickupname', nullable: true, length: 255 })
  pickupname: string | null;

  @Column('varchar', { name: 'pickupphone', nullable: true, length: 20 })
  pickupphone: string | null;
}
