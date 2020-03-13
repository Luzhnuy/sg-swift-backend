import { Entity, Column, JoinColumn, OneToOne, ManyToOne } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { CustomerEntity } from './customer.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';

@Entity()
@OwnerFields(['userId'])
export class CustomerMetadataEntity extends ContentEntity {

  @OneToOne(type => CustomerEntity, customer => customer.metadata, {
    nullable: false,
    lazy: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  customer: CustomerEntity;

  @Column()
  customerId: number;

  @ManyToOne(type => UserEntity, {
    nullable: true,
    lazy: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  refUser: UserEntity;

  @Column({ default: null, nullable: true })
  refUserId: number;

  @Column('boolean', { default: false })
  refPaid: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 0, nullable: false, transformer: ColumnNumericTransformer })
  credit: number;

  @Column('int', { default: null, nullable: true, comment: 'Amount in cents (see order.debtAmount)' })
  debtAmount: number;

  @Column('boolean', { default: false })
  isFacebook: boolean;

  @Column('text', {
    nullable: true,
    default: null,
  })
  appVersion: string;

  constructor(data: Partial<CustomerMetadataEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
