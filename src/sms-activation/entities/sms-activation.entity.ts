import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../cms/users/entities/user.entity';

@Entity()
export class SmsActivationEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @OneToOne(type => UserEntity, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: number;

  @Column('varchar', { length: 4 })
  code: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP'})
  public createdAt: Date;

  constructor(data: Partial<SmsActivationEntity>) {
    if (data) {
      Object.assign(this, data);
    }
    if (!this.code) {
      this.code = this.generateCode();
      // TODO generate random code
    }
  }

  generateCode() {
    function getRandomInt(max) {
      return Math.floor(Math.random() * Math.floor(max));
    }
    return ('0000' + getRandomInt(9999)).slice(-4);
  }

}
