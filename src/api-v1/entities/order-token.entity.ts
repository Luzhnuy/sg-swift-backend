import { Entity, Column, Unique, Generated, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@Unique(['token'])
export class OrderTokenEntity {

  @PrimaryGeneratedColumn()
  @Generated('uuid')
  token: string;

  @Column('text')
  data: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP'})
  createdAt: Date;

  constructor(data?: Partial<OrderTokenEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
