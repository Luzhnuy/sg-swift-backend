import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('id', ['id'], { unique: true })
@Entity('accounts', { database: 'snapgrab_prod' })
export class Accounts {

  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
    // @Column('int', { name: 'id' })
  id: number;

  @Column('varchar', { name: 'name', length: 200 })
  name: string;

  @Column('varchar', { name: 'email', length: 200 })
  email: string;

  @Column('varchar', { name: 'phone', length: 12 })
  phone: string;

  @Column('varchar', { name: 'website', length: 100 })
  website: string;

  @Column('varchar', { name: 'logo', length: 300, default: () => '"NNIMG"' })
  logo: string;

  @Column('varchar', { name: 'city', length: 50 })
  city: string;

  @Column('varchar', { name: 'address', length: 600 })
  address: string;

  @Column('varchar', { name: 'province', length: 100 })
  province: string;

  @Column('varchar', { name: 'zipcode', length: 10 })
  zipcode: string;

  @Column('varchar', { name: 'description', length: 500 })
  description: string;

  @Column('varchar', { name: 'picture', length: 200 })
  picture: string;

  @Column('int', { name: 'enabled', default: () => '"0"' })
  enabled: number;

  @Column('int', { name: 'enabledmenu', default: () => '"0"' })
  enabledmenu: number;

  @Column('varchar', { name: 'openhour', length: 6, default: () => '"10"' })
  openhour: string;

  @Column('varchar', { name: 'closehour', length: 6, default: () => '"22"' })
  closehour: string;

  @Column('int', { name: 'deleted' })
  deleted: number;

  @Column('timestamp', { name: 'created', default: () => 'CURRENT_TIMESTAMP' })
  created: Date;
}
