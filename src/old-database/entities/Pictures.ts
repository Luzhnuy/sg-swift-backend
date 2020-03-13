import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pictures', { database: 'snapgrab_prod' })
export class Pictures {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'userid' })
  userid: number;

  @Column('varchar', { name: 'clientkey', length: 100 })
  clientkey: string;

  @Column('varchar', { name: 'image', length: 250 })
  image: string;

  @Column('varchar', { name: 'category', length: 2, default: () => '"0"' })
  category: string;

  @Column('timestamp', { name: 'created', default: () => 'CURRENT_TIMESTAMP' })
  created: Date;
}
