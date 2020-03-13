import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('orders', { database: 'snapgrab_prod' })
export class Orders {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'tabler', length: 50 })
  tabler: string;

  @Column('varchar', { name: 'clientkey', length: 300 })
  clientkey: string;

  @Column('int', { name: 'state', default: () => '"0"' })
  state: number;

  @Column('varchar', { name: 'orderitems', length: 500 })
  orderitems: string;

  @Column('varchar', { name: 'total', length: 50 })
  total: string;

  @Column('timestamp', { name: 'created', default: () => 'CURRENT_TIMESTAMP' })
  created: Date;
}
