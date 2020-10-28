import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { OrderEntity } from './order.entity';

export enum DeliveryToOptions {
  Address = 'Address',
  Neighbour = 'Neighbour',
  Reception = 'Reception',
  Other = 'Other',
  Unavailable = 'Unavailable',
}

@Entity()
export class OrderDeliveredToEntity extends ContentEntity {

  @OneToOne(type => OrderEntity, metadata => metadata.deliveredTo, {
    lazy: true,
    cascade: false,
  })
  @JoinColumn()
  order: OrderEntity;

  @Column()
  orderId: number;

  @Column('enum', {
    enum: DeliveryToOptions,
  })
  option: DeliveryToOptions;

  @Column({ nullable: true, default: null })
  name: string;

  @Column({ nullable: true, default: null })
  address: string;

  @Column({ nullable: true, default: null })
  phone: string;

  @Column({ nullable: true, default: null })
  idType: string;

  @Column({ nullable: true, default: null })
  idNumber: string;

  @Column({ nullable: true, default: null })
  birthDate: string;

  constructor(init?: Partial<OrderDeliveredToEntity>) {
    super();
    if (init) {
      Object.assign(this, init);
    }
  }
}
