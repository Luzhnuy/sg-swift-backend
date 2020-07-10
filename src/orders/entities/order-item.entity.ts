import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, RelationId } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { OrderEntity } from './order.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';
import { MenuItemEntity } from '../../merchants/entities/menu-item.entity';
import { MenuSubOptionEntity } from '../../merchants/entities/menu-sub-option.entity';

@Entity()
export class OrderItemEntity extends ContentEntity {

  @ManyToOne(type => OrderEntity, metadata => metadata.orderItems, {
    lazy: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  order: OrderEntity;

  @Column()
  orderId: number;

  @ManyToOne(type => MenuItemEntity, {
    nullable: true,
    lazy: true,
    cascade: false,
  })
  @JoinColumn()
  menuItem: MenuItemEntity;

  @Column({ default: null })
  menuItemId: number;

  @Column({ nullable: true, default: null })
  sku: string;

  @Column({ nullable: true, default: null })
  quantity: number;

  @Column('decimal', { precision: 8, scale: 2, default: null, nullable: true, transformer: ColumnNumericTransformer })
  price: number;

  @Column({ nullable: true, default: null })
  description: string;

  @Column('varchar', { length: 50, nullable: true, default: null })
  name: string;

  @Column('text', { nullable: true, default: null })
  comment: string;

  @ManyToMany(type => MenuSubOptionEntity, {
    // lazy: true,
    cascade: true,
  })
  @JoinTable()
  subOptions: MenuSubOptionEntity[];

  @RelationId((orderItem: OrderItemEntity) => orderItem.subOptions)
  subOptionIds: number[];

  constructor(init?: Partial<OrderItemEntity>) {
    super();
    if (init) {
      Object.assign(this, init);
    }
  }
}
