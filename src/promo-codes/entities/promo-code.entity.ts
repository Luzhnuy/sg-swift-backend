import {
  Entity,
  Column,
  Unique,
} from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';

@Entity()
@Unique(['code'])
export class PromoCodeEntity extends ContentEntity {

  @Column('varchar', {
    length: 8,
    nullable: false,
  })
  code: string;

  @Column('smallint', {
    nullable: false,
  })
  discount: number;

}
