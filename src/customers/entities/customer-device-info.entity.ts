import { Entity, Column, JoinColumn, OneToOne } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { CustomerEntity } from './customer.entity';

@Entity()
@OwnerFields(['userId'])
export class CustomerDeviceInfoEntity extends ContentEntity {

  @OneToOne(type => CustomerEntity, customer => customer.deviceInfo, {
    lazy: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  customer: CustomerEntity;

  @Column()
  customerId: number;

  @Column('text', {
    nullable: true,
    default: null,
  })
  manufacturer: string;

  @Column('text', {
    nullable: true,
    default: null,
  })
  model: string;

  @Column('text', {
    nullable: true,
    default: null,
  })
  platform: string;

  @Column('text', {
    nullable: true,
    default: null,
  })
  version: string;

  @Column('text', {
    nullable: true,
    default: null,
  })
  uuid: string;

  constructor(data: Partial<CustomerDeviceInfoEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
