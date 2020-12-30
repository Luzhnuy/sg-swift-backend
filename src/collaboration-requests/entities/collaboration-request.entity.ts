import { Entity, Column } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';

enum RequestType {
  Merchant = 'Merchant',
  Driver = 'Driver',
}

@Entity()
export class CollaborationRequestEntity extends ContentEntity {

  @Column('varchar', { length: 32 })
  name: string;

  @Column('text')
  phone: string;

  @Column('text')
  email: string;

  @Column('text', { nullable: true, default: null })
  city: string;

  @Column('varchar', { length: 64, nullable: true, default: null })
  title: string;

  @Column('boolean', { default: true })
  isNew: boolean;

  @Column('enum', {
    enum: RequestType,
  })
  type: RequestType;

  constructor(data: Partial<CollaborationRequestEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
