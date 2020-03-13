import { Column, Entity, Index, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrderEntity } from './order.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';
// import { UserEntity } from '../../cms/users/entities/user.entity';

export enum PaymentMethods {
  ApplePay = 'Apple Pay',
  Stripe = 'Stripe',
  PayPal = 'PayPal',
}

@Entity()
export class OrderMetadataEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(type => OrderEntity, order => order.metadata, {
    lazy: true,
  })
  order: OrderEntity;

  @Column('decimal', { precision: 8, scale: 2, default: null, nullable: true, transformer: ColumnNumericTransformer})
  distance: number;

  @Column('text', { default: null, nullable: true })
  description: string;

  @Column({ default: null, nullable: true })
  largeOrder: boolean;

  @Column({ default: null, nullable: true })
  bringBack: boolean;

  // Amounts
  @Column('decimal', { precision: 8, scale: 2, default: null, nullable: true, transformer: ColumnNumericTransformer })
  deliveryCharge: number;

  @Column('decimal', { precision: 8, scale: 2, default: null, nullable: true, transformer: ColumnNumericTransformer })
  subtotal: number;

  @Column('decimal', { precision: 12, scale: 4, default: null, nullable: true, transformer: ColumnNumericTransformer })
  serviceFee: number;

  @Column('decimal', { precision: 8, scale: 4, default: null, nullable: true, transformer: ColumnNumericTransformer })
  tps: number;

  @Column('decimal', { precision: 8, scale: 4, default: null, nullable: true, transformer: ColumnNumericTransformer })
  tvq: number;

  @Column('decimal', { precision: 8, scale: 2,  nullable: true, default: null, transformer: ColumnNumericTransformer })
  tip: number;

  @Column('decimal', { precision: 8, scale: 2,  nullable: true, default: null, transformer: ColumnNumericTransformer })
  tipPercent: number;

  @Column('decimal', { precision: 8, scale: 2, default: null, nullable: true, transformer: ColumnNumericTransformer })
  customAmount: number;

  @Column('decimal', { precision: 10, scale: 4, default: null, nullable: true, transformer: ColumnNumericTransformer })
  totalAmount: number;

  @Column('int', { default: null, nullable: true, comment: 'amount in cents (see Stripe docs)' })
  chargedAmount: number;

  @Column('int', { default: null, nullable: true, comment: 'amount in cents (see Stripe docs)' })
  chargedAmount2: number;

  @Column('int', { default: null, nullable: true, comment: 'amount in cents (like chargedAmount)' })
  debtAmount: number;

  @Column('int', { default: null, nullable: true, comment: 'Local time in minutes' })
  scheduledTime: number;

  // Delivery info

  // TODO unnecessary now. Currently it's merchantId in OrderEntity
  @Column('text', {
    nullable: true,
    default: null,
    comment: 'MerchantId',
  })
  reference: string;

  @Column('text')
  pickUpAddress: string;

  @Column('text')
  dropOffAddress: string;

  @Column('decimal', { precision: 12, scale: 8, default: null, nullable: true, transformer: ColumnNumericTransformer })
  pickUpLat: number;

  @Column('decimal', { precision: 12, scale: 8, default: null, nullable: true, transformer: ColumnNumericTransformer })
  pickUpLon: number;

  @Column('decimal', { precision: 12, scale: 8, default: null, nullable: true, transformer: ColumnNumericTransformer })
  dropOffLat: number;

  @Column('decimal', { precision: 12, scale: 8, default: null, nullable: true, transformer: ColumnNumericTransformer })
  dropOffLon: number;

  @Column('text', { nullable: true, default: null })
  dropOffTitle: string;

  @Column('text', { nullable: true, default: null })
  dropOffPhone: string;

  @Column('text', { nullable: true, default: null })
  pickUpTitle: string;

  @Column('text', { nullable: true, default: null })
  pickUpPhone: string;

  @Column('text', { nullable: true, default: null })
  pickUpEmail: string;

  @Column('text', { nullable: true, default: null })
  dropOffEmail: string;

  @Column('text', { nullable: true, default: null })
  deliveryInstructions: string;

  @Column('text', { nullable: true, default: null })
  chargeId: string;

  @Column('text', { nullable: true, default: null })
  chargeId2: string;

  @Column('varchar', { length: 4, nullable: true, default: null })
  lastFour: string;

  @Column('text', { nullable: true, default: null })
  customerPhoto: string;

  @Column('text', { nullable: true, default: null })
  driverPhoto: string;

  @Column('text', { nullable: true, default: null })
  promoCode: string;

  @Column('decimal', { precision: 4, scale: 2, nullable: true, default: 0, transformer: ColumnNumericTransformer })
  discount: number;

  @Column('enum', { enum: PaymentMethods, default: PaymentMethods.Stripe, nullable: true })
  paymentMethod: PaymentMethods;

  // TODO unnecessary now. Currently it's customerId in OrderEntity
  @Column('text', { default: null, nullable: true })
  clientId: string;

  @Column('text', { default: null, nullable: true })
  cancellationReason: string;

  @Column('integer', { nullable: false, default: -300 })
  utcOffset: number;

  constructor(init?: Partial<OrderMetadataEntity>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}
