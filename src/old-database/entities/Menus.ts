import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('nameeng', ['nameeng'], {})
@Entity('menus', { database: 'snapgrab_prod' })
export class Menus {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'userid' })
  userid: number;

  @Column('varchar', { name: 'clientkey', length: 200 })
  clientkey: string;

  @Column('varchar', { name: 'category', length: 5 })
  category: string;

  @Column('varchar', { name: 'namefra', length: 50 })
  namefra: string;

  @Column('varchar', { name: 'nameeng', length: 50 })
  nameeng: string;

  @Column('varchar', { name: 'shortdescriptionfra', length: 100 })
  shortdescriptionfra: string;

  @Column('varchar', { name: 'shortdescriptioneng', length: 100 })
  shortdescriptioneng: string;

  @Column('varchar', { name: 'longdescriptionfra', length: 500 })
  longdescriptionfra: string;

  @Column('varchar', { name: 'longdescriptioneng', length: 500 })
  longdescriptioneng: string;

  @Column('varchar', { name: 'price', length: 5 })
  price: string;

  @Column('varchar', { name: 'image', length: 300 })
  image: string;

  @Column('int', { name: 'disabled', default: () => '"0"' })
  disabled: number;

  @Column('int', { name: 'enabled', default: () => '"0"' })
  enabled: number;

  @Column('timestamp', { name: 'created', default: () => 'CURRENT_TIMESTAMP' })
  created: Date;
}
