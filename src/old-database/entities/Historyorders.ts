import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('historyorders', { database: 'snapgrab_prod' })
export class Historyorders {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'chargeid', length: 200 })
  chargeid: string;

  @Column('varchar', { name: 'jobid', length: 200 })
  jobid: string;

  @Column('varchar', { name: 'userid', length: 20 })
  userid: string;

  @Column('varchar', { name: 'amount', length: 50 })
  amount: string;

  @Column('text', { name: 'description' })
  description: string;

  @Column('varchar', { name: 'status', length: 50 })
  status: string;

  @Column('varchar', { name: 'type', length: 50 })
  type: string;

  @Column('longtext', { name: 'photo', nullable: true })
  photo: string | null;

  @Column('double', { name: 'localtime' })
  localtime: number;

  @Column('timestamp', { name: 'created', default: () => 'CURRENT_TIMESTAMP' })
  created: Date;

  @Column('decimal', {
    name: 'deliveryfee',
    nullable: true,
    precision: 13,
    scale: 4,
  })
  deliveryfee: string | null;

  @Column('varchar', { name: 'promocode', nullable: true, length: 255 })
  promocode: string | null;

  @Column('decimal', { name: 'tax', nullable: true, precision: 13, scale: 4 })
  tax: string | null;

  @Column('decimal', {
    name: 'servicefee',
    nullable: true,
    precision: 13,
    scale: 4,
  })
  servicefee: string | null;

  @Column('decimal', {
    name: 'total_amount',
    nullable: true,
    precision: 13,
    scale: 4,
  })
  totalAmount: string | null;

  @Column('decimal', {
    name: 'subtotal',
    nullable: true,
    precision: 13,
    scale: 4,
  })
  subtotal: string | null;

  @Column('decimal', { name: 'tip', nullable: true, precision: 13, scale: 4 })
  tip: string | null;

  @Column('varchar', { name: 'tipsign', nullable: true, length: 2 })
  tipsign: string | null;

  @Column('varchar', { name: 'last4', nullable: true, length: 8 })
  last4: string | null;

  @Column('varchar', { name: 'paymentmethod', nullable: true, length: 25 })
  paymentmethod: string | null;
}
