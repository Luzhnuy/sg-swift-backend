import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { MerchantEntity } from '../../merchants/entities/merchant.entity';
import { ContentEntity } from '../../cms/content/entities/content.entity';

@Entity()
export class FavoriteEntity extends ContentEntity {

  @ManyToOne(type => MerchantEntity, {
    lazy: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  merchant: MerchantEntity;

  @Column()
  merchantId: number;

  constructor(data: Partial<FavoriteEntity>) {
    super();
    this.isPublished = true;
    if (data) {
      Object.assign(this, data);
    }
  }
}
