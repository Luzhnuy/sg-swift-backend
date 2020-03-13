import { Column, Entity, Index } from 'typeorm';

@Index('apiid', ['apiid', 'stripeid'], { unique: true })
@Entity('stripecustomers', { database: 'snapgrab_prod' })
export class Stripecustomers {
  @Column('bigint', { primary: true, name: 'apiid' })
  apiid: string;

  @Column('varchar', { primary: true, name: 'stripeid', length: 100 })
  stripeid: string;

  @Column('varchar', { name: 'source', length: 100 })
  source: string;

  @Column('varchar', { name: 'brand', length: 20 })
  brand: string;

  @Column('varchar', { name: 'last4', length: 20 })
  last4: string;
}
