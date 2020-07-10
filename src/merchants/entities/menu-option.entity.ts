import { Entity, Column, ManyToOne, JoinColumn, ManyToMany, OneToMany, JoinTable } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { MenuItemEntity } from './menu-item.entity';
import { MerchantEntity } from './merchant.entity';
import { MenuItemOptionEntity } from './menu-item-option.entity';
import { MenuSubOptionEntity } from './menu-sub-option.entity';

@Entity()
@OwnerFields(['merchant.userId'])
export class MenuOptionEntity extends ContentEntity {

  @ManyToOne(type => MerchantEntity, {
    lazy: true,
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  merchant: MerchantEntity;

  @Column()
  merchantId: number;

  @ManyToMany(type => MenuItemOptionEntity, io => io.option, {
    lazy: true,
  })
  @JoinTable()
  items: MenuItemOptionEntity[];

  @OneToMany(type => MenuSubOptionEntity, subOption => subOption.option, {
    eager: true,
  })
  subOptions: MenuSubOptionEntity[];

  @Column('text')
  title: string;

  @Column('boolean', { default: true })
  enabled: boolean;

  constructor(data: Partial<MenuItemEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
