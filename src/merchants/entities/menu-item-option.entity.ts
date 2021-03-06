import { Entity, Column, ManyToOne, JoinColumn, ManyToMany } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { MenuItemEntity } from './menu-item.entity';
import { MenuOptionEntity } from './menu-option.entity';
import { MerchantEntity } from './merchant.entity';

@Entity()
@OwnerFields(['merchant.userId'])
export class MenuItemOptionEntity extends ContentEntity {

  @ManyToOne(type => MerchantEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  merchant: MerchantEntity;

  @Column('int')
  merchantId: number;

  @ManyToOne(type => MenuItemEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  item: MenuItemEntity;

  @Column('int')
  itemId: number;

  @ManyToOne(type => MenuOptionEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  option: MenuOptionEntity;

  @Column('int')
  optionId: number;

  @Column('int')
  count: number;

  constructor(data: Partial<MenuItemEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
