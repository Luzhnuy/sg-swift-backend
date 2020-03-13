import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  BeforeUpdate,
  AfterLoad,
  OneToOne,
  Generated,
  Index,
  OneToMany,
  Unique,
} from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { DriverProfileEntity } from '../../drivers/entities/driver-profile.entity';
import { OrderMetadataEntity } from './order-metadata.entity';
import { OrderDeliveredToEntity } from './order-delivered-to.entity';
import { OrderItemEntity } from './order-item.entity';
import { MerchantEntity } from '../../merchants/entities/merchant.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { CustomerEntity } from '../../customers/entities/customer.entity';

export enum OrderStatus {
  Cancelled = 'Cancelled',
  OnWay = 'OnWay',
  Accepted = 'Accepted',
  Completed = 'Completed',
  Received = 'Received',
}

export enum OrderSource {
  Customer = 'Customer',
  CustomerOld = 'CustomerOld',
  Merchant = 'Merchant',
  Manual = 'Manual',
}

export enum OrderType {
  Custom = 'Custom',
  Menu = 'Menu',
  Booking = 'Booking',
}

@Entity()
@Unique(['uuid'])
@OwnerFields(['authorId', 'merchant.userId', 'customer.userId'])
export class OrderEntity extends ContentEntity {

  private prevStatus: OrderStatus;

  @AfterLoad()
  rememberPreviousStatus() {
    this.prevStatus = this.status;
  }

  @BeforeUpdate()
  updateStatusChangedTime() {
    if (this.prevStatus !== this.status) {
      switch (this.status) {
        case OrderStatus.Accepted:
          this.acceptedAt = new Date();
          break;
        case OrderStatus.OnWay:
          this.onWayAt = new Date();
          break;
        case OrderStatus.Cancelled:
          this.cancelledAt = new Date();
          this.isPublished = false;
          break;
        case OrderStatus.Completed:
          this.completedAt = new Date();
          this.isPublished = false;
          break;
      }
    }
  }

  @Column()
  @Generated('uuid')
  uuid: string;

  @OneToOne(type => OrderMetadataEntity, metadata => metadata.order, {
    eager: true,
    cascade: true,
  })
  @JoinColumn()
  metadata: OrderMetadataEntity;

  @Column()
  metadataId: number;

  @ManyToOne(type => DriverProfileEntity, {
    nullable: true,
    eager: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn()
  driverProfile: DriverProfileEntity;

  @Column({ default: null, nullable: true })
  driverProfileId: number;

  @ManyToOne(type => MerchantEntity, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: true,
    cascade: false,
  })
  @JoinColumn()
  merchant: MerchantEntity;

  @Column({ default: null, nullable: true })
  merchantId: number = null;

  @ManyToOne(type => CustomerEntity, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: true,
    cascade: false,
  })
  @JoinColumn()
  customer: CustomerEntity;

  @Index()
  @Column({ default: null, nullable: true })
  customerId: number;

  @OneToOne(type => OrderDeliveredToEntity, deliveredTo => deliveredTo.order, {
    eager: true,
  })
  deliveredTo: OrderDeliveredToEntity;

  @OneToMany(type => OrderItemEntity, orderItems => orderItems.order, {
    eager: true,
  })
  orderItems: OrderItemEntity[];

  @Column('enum', {
    enum: OrderStatus,
    default: OrderStatus.Received,
  })
  status: OrderStatus;

  @Column('enum', {
    enum: OrderSource,
  })
  source: OrderSource;

  @Column('enum', {
    enum: OrderType,
  })
  type: OrderType;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP'})
  scheduledAt: Date;

  @Column('timestamp', {
    nullable: true,
    default: null,
  })
  acceptedAt: Date;

  @Column('timestamp', {
    nullable: true,
    default: null,
  })
  onWayAt: Date;

  @Column('timestamp', {
    nullable: true,
    default: null,
  })
  completedAt: Date;

  @Column('timestamp', {
    nullable: true,
    default: null,
  })
  cancelledAt: Date;

  constructor(init?: Partial<OrderEntity>) {
    super();
    if (init) {
      Object.assign(this, init);
    }
  }
}
