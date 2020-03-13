import { Entity, Column } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';

@Entity()
export class SgInfoBoxEntity extends ContentEntity {

  @Column('varchar', { length: 32 })
  name: string;

  @Column('text', { nullable: true, default: null })
  description: string;

  @Column('text', { nullable: true, default: null })
  explainer: string;

  @Column('varchar', { length: 64, nullable: true, default: null })
  image: string;

  @Column('varchar', { length: 7, default: '#FFFFFF' })
  bgColor: string;

  @Column('varchar', { length: 7, default: '#FFFFFF' })
  textColor: string;

  constructor(data: Partial<SgInfoBoxEntity>) {
    super();
    this.isPublished = true;
    if (data) {
      Object.assign(this, data);
    }
  }
}
