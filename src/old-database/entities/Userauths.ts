import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('userauths', { database: 'snapgrab_prod' })
export class Userauths {

  @Column('int', { name: 'userid' })
  userid: number;

  @PrimaryColumn('varchar', { name: 'token', length: 128 })
  token: string;

  @Column('timestamp', {
    name: 'created',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  created: Date | null;
}
