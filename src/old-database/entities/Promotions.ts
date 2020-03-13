import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('promotions', { database: 'snapgrab_prod' })
export class Promotions {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'code', length: 10 })
  code: string;

  @Column('int', { name: 'amount' })
  amount: number;

  @Column('int', { name: 'applayed' })
  applayed: number;
}
