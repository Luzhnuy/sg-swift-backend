import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('orderitems', { database: 'snapgrab_prod' })
export class Orderitems {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'clientkey', length: 300 })
  clientkey: string;

  @Column('int', { name: 'orderid' })
  orderid: number;

  @Column('int', { name: 'item' })
  item: number;
}
