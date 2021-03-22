import { Entity, Column, ManyToOne, JoinColumn, Index, ManyToMany, JoinTable, BeforeInsert, BeforeUpdate } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { MerchantEntity } from './merchant.entity';
import { MenuCategoryEntity } from './menu-category.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { MenuItemOptionEntity } from './menu-item-option.entity';

@Entity()
@OwnerFields(['merchant.userId'])
export class MenuItemEntity extends ContentEntity {

  @ManyToOne(type => MenuCategoryEntity, {
    lazy: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  category: MenuCategoryEntity;

  @Column()
  categoryId: number;

  @ManyToOne(type => MerchantEntity, {
    eager: true,
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  merchant: MerchantEntity;

  @Column()
  merchantId: number;

  @ManyToMany(type => MenuItemOptionEntity, io => io.item, {
    eager: true,
  })
  @JoinTable()
  options: MenuItemOptionEntity[];

  @Index({ fulltext: true })
  @Column('varchar', { length: 64 })
  name: string;

  @Column('text')
  description: string;

  @Column('varchar', { length: 255, nullable: true })
  squareId: string;

  @Column('decimal', {  precision: 8, scale: 2, default: null, nullable: true, transformer: ColumnNumericTransformer })
  price: number;

  @Column('varchar', { length: 255, nullable: true, default: null })
  image: string;

  @Column('boolean', { default: false })
  isWaiting: boolean;

  @Column('smallint', { default: -1 })
  inventory: number;

  @Column('boolean', { default: false })
  quantityStopper: boolean;

  constructor(data: Partial<MenuItemEntity>) {
    super();
    this.isPublished = false;
    if (data) {
      Object.assign(this, data);
    }
  }
}
