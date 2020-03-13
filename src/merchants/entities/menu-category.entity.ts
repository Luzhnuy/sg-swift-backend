import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { MenuItemEntity } from './menu-item.entity';
import { MerchantEntity } from './merchant.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';

@Entity()
@OwnerFields(['merchant.userId'])
export class MenuCategoryEntity extends ContentEntity {

  @OneToMany(type => MenuItemEntity, item => item.category, {
    eager: true,
  })
  items: MenuItemEntity[];

  @ManyToOne(type => MerchantEntity, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  merchant: MerchantEntity;

  @Column()
  merchantId: number;

  @Column('varchar', { length: 70 })
  name: string;

  @Column('text', { nullable: true, default: null })
  description: string;

  constructor(data: Partial<MenuCategoryEntity>) {
    super();
    this.isPublished = true;
    if (data) {
      Object.assign(this, data);
    }
  }
}
