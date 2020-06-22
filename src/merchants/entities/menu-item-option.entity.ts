import { Entity, Column, ManyToOne, JoinColumn, ManyToMany } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { MenuItemEntity } from './menu-item.entity';
import { MerchantEntity } from './merchant.entity';

@Entity()
@OwnerFields(['merchant.userId'])
export class MenuItemOption extends ContentEntity {

  @ManyToOne(type => MerchantEntity, {
    lazy: true,
    cascade: true,
    nullable: false,
  })
  @JoinColumn()
  merchant: MerchantEntity;

  @Column()
  merchantId: number;

  @ManyToMany(type => MenuItemEntity, {
    lazy: true,
    nullable: true,
    onDelete: 'DEFAULT',
  })
  @JoinColumn()
  items: MenuItemEntity[];

  @Column('text')
  title: string;

  constructor(data: Partial<MenuItemEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
