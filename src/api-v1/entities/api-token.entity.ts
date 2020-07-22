import { Entity, Column, JoinColumn, OneToOne, Unique, Generated, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../cms/users/entities/user.entity';

@Entity()
@Unique(['token'])
export class ApiTokenEntity {

  @PrimaryGeneratedColumn()
  @Generated('uuid')
  token: string;

  @OneToOne(type => UserEntity, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: number;

  constructor(data?: Partial<ApiTokenEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
