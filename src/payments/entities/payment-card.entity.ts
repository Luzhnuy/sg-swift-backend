import { Entity, Column } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';

@Entity()
export class PaymentCardEntity extends ContentEntity {

  @Column('text')
  cardId: string;

  @Column('text')
  customerId: string;

  @Column('text')
  brand: string;

  @Column('text')
  last4: string;

  constructor(data: Partial<PaymentCardEntity>) {
    super();
    this.isPublished = true;
    if (data) {
      Object.assign(this, data);
    }
  }
}
