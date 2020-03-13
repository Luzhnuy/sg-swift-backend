import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('userid', ['userid'], { unique: true })
@Entity('email_subscriptions', { database: 'snapgrab_prod' })
export class EmailSubscriptions {
  @Column('int', { name: 'userid', unique: true })
  userid: number;

  @Column('int', { name: 'receipts', default: () => '"1"' })
  receipts: number;

  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;
}
