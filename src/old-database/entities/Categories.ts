import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories', { database: 'snapgrab_prod' })
export class Categories {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'clientkey', length: 200 })
  clientkey: string;

  @Column('varchar', { name: 'namefra', length: 200 })
  namefra: string;

  @Column('varchar', { name: 'nameeng', length: 200 })
  nameeng: string;

  @Column('varchar', { name: 'shortdescriptionfra', length: 200 })
  shortdescriptionfra: string;

  @Column('varchar', { name: 'shortdescriptioneng', length: 200 })
  shortdescriptioneng: string;

  @Column('timestamp', { name: 'created', default: () => 'CURRENT_TIMESTAMP' })
  created: Date;

  @Column('int', { name: 'userid' })
  userid: number;
}
