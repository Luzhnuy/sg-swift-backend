import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('str_id_unique', ['strId'], { unique: true })
@Entity('app_params', { database: 'snapgrab_prod' })
export class AppParams {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'str_id', unique: true, length: 64 })
  strId: string;

  @Column('varchar', { name: 'value', length: 250 })
  value: string;

  @Column('varchar', { name: 'description', length: 250 })
  description: string;
}
