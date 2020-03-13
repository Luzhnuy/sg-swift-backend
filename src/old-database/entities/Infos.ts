import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('infos', { database: 'snapgrab_prod' })
export class Infos {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'status', length: 50 })
  status: string;
}
