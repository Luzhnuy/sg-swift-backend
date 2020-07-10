import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SchedulerTaskEntity {

  @PrimaryGeneratedColumn()
  id?: number;

  @Column('varchar', { length: 24, nullable: false })
  key: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP'})
  scheduledAt: Date;

  @Column('int', { nullable: false, default: 0, comment: 'In seconds'})
  interval?: number;

  @Column('tinytext', { nullable: true, default: null })
  data?: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP'})
  createdAt?: Date;

  @Column('timestamp', { nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP'})
  lastRunAt?: Date;

  constructor(data: SchedulerTaskEntity) {
    Object.assign(this, data);
  }

}
