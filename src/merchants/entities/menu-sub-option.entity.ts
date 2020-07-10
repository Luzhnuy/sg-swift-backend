import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { MenuItemEntity } from './menu-item.entity';
import { MenuOptionEntity } from './menu-option.entity';
import { MerchantEntity } from './merchant.entity';

@Entity()
@OwnerFields(['merchant.userId'])
export class MenuSubOptionEntity extends ContentEntity {

  @ManyToOne(type => MerchantEntity, {
    lazy: true,
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  merchant: MerchantEntity;

  @Column()
  merchantId: number;

  @ManyToOne(type => MenuOptionEntity, option => option.subOptions, {
    lazy: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  option: MenuOptionEntity;

  @Column()
  optionId: number;

  @Column('text')
  title: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0, nullable: false, transformer: ColumnNumericTransformer })
  price: number;

  @Column('boolean', { default: true })
  enabled: boolean;

  constructor(data: Partial<MenuItemEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
