import { Entity, Column, JoinColumn, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, OneToMany, AfterLoad, BeforeUpdate } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { DriverStatusEntity } from './driver-status.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';

export enum DriverType {
  Car = 'Car',
  Bicycle = 'Bicycle',
}

@Entity()
@OwnerFields('userId')
export class DriverProfileEntity extends ContentEntity {

  @OneToOne(type => UserEntity, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: number;

  @OneToOne(type => DriverStatusEntity, status => status.profile, {
    eager: true,
    cascade: ['insert', 'update'],
  })
  @JoinColumn()
  status: DriverStatusEntity;

  @Column('varchar', { length: 64 })
  firstName: string;

  @Column('varchar', { length: 64 })
  lastName: string;

  @Column('varchar', { length: 80 })
  email: string;

  @Column('varchar', { length: 16 })
  phone: string;

  @Column('enum', {
    enum: DriverType,
  })
  type: DriverType;

  @Column('int', { default: 0 })
  maxSimultaneousDelivery: number;

  constructor(data: Partial<DriverProfileEntity>) {
    super();
    this.isPublished = true;
    if (data) {
      Object.assign(this, data);
    }
  }
}
