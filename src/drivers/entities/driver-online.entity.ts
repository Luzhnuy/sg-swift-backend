import { Entity, Column, JoinColumn, OneToOne, ManyToOne, OneToMany } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
// import { DriverProfileEntity } from './driver-profile.entity';
import { UserEntity } from '../../cms/users/entities/user.entity';

@Entity()
export class DriverOnlineEntity extends ContentEntity {

  @ManyToOne(type => UserEntity, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: number;

  @Column('timestamp', { default: null })
  workingDate: Date;

  @Column('timestamp', { default: null })
  startDatetime: Date;

  @Column('timestamp', { default: null })
  endDatetime: Date;

  @Column('int')
  timezoneOffset: number;

  constructor(data: Partial<DriverOnlineEntity>) {
    super();
    this.isPublished = true;
    if (data) {
      Object.assign(this, data);
    }
  }
}
