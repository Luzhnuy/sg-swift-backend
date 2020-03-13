import { Entity, Column } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';

@Entity()
export class SgTokenEntity extends ContentEntity {

  @Column('text')
  value: string;

  constructor(data: Partial<SgTokenEntity>) {
    super();
    this.isPublished = true;
    if (data) {
      Object.assign(this, data);
    }
  }
}
