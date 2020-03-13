import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('username', ['username'], { unique: true })
@Entity('users', { database: 'snapgrab_prod' })
export class Users {

  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'username', unique: true, length: 200 })
  username: string;

  @Column('varchar', { name: 'password', length: 200 })
  password: string;

  @Column('varchar', { name: 'firstname', length: 200 })
  firstname: string;

  @Column('varchar', { name: 'lastname', length: 200 })
  lastname: string;

  @Column('int', { name: 'parent', default: () => '"1"' })
  parent: number;

  @Column('int', { name: 'ref_user_id', nullable: true })
  refUserId: number | null;

  @Column('tinyint', { name: 'ref_paid', width: 1, default: () => '"0"' })
  refPaid: boolean;

  @Column('varchar', { name: 'marketing_email', nullable: true, length: 255 })
  marketingEmail: string | null;

  @Column('float', { name: 'credit', precision: 12 })
  credit: number;

  @Column('varchar', { name: 'securitycode', nullable: true, length: 100 })
  securitycode: string | null;

  @Column('varchar', { name: 'clientkey', length: 200 })
  clientkey: string;

  @Column('varchar', { name: 'devicemanufacturer', length: 100 })
  devicemanufacturer: string;

  @Column('varchar', { name: 'devicemodel', length: 100 })
  devicemodel: string;

  @Column('varchar', { name: 'deviceplatform', length: 100 })
  deviceplatform: string;

  @Column('varchar', { name: 'deviceversion', length: 100 })
  deviceversion: string;

  @Column('varchar', { name: 'deviceuuid', length: 100 })
  deviceuuid: string;

  @Column('varchar', { name: 'phone', length: 100 })
  phone: string;

  @Column('varchar', { name: 'usertype', length: 100 })
  usertype: string;

  @Column('int', { name: 'isfacebooke' })
  isfacebooke: number;

  @Column('timestamp', { name: 'created', default: () => 'CURRENT_TIMESTAMP' })
  created: Date;

  @Column('varchar', { name: 'appversion', nullable: true, length: 15 })
  appversion: string | null;
}
