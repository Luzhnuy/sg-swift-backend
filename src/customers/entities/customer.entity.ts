import { Entity, Column, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { CustomerMetadataEntity } from './customer-metadata.entity';
import { CustomerDeviceInfoEntity } from './customer-device-info.entity';

@Entity()
@OwnerFields(['userId'])
export class CustomerEntity extends ContentEntity {

  @OneToOne(type => UserEntity, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: UserEntity;

  @Column()
  userId: number;

  @Column('int', { nullable: true, default: null, comment: 'Client Id from the first version' })
  clientId: number;

  @OneToOne(type => CustomerMetadataEntity, metadata => metadata.customer, {
    eager: true,
    cascade: true,
  })
  metadata: CustomerMetadataEntity;

  @OneToOne(type => CustomerDeviceInfoEntity, deviceInfo => deviceInfo.customer, {
    lazy: true,
    cascade: true,
  })
  deviceInfo: CustomerDeviceInfoEntity;

  @Column('varchar', { length: 48 })
  firstName: string;

  @Column('varchar', { length: 32 })
  lastName: string;

  @Column('text', { nullable: true, default: null })
  phone: string;

  @Column('text', { nullable: true, default: null })
  email: string;

  constructor(data: Partial<CustomerEntity>) {
    super();
    this.isPublished = false;
    if (data) {
      Object.assign(this, data);
    }
  }
}
