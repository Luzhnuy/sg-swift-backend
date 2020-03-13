import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('params', { database: 'snapgrab_prod' })
export class Params {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'status', length: 50 })
  status: string;
}
