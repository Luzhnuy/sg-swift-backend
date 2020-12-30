import { Entity, Column } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';

@Entity()
export class AppleTempUserEntity extends ContentEntity {

  @Column('text')
  email: string;

  @Column('text')
  login: string;

  @Column('text')
  password: string;

  @Column('varchar', { length: 32, default: '' })
  firstName: string;

  @Column('varchar', { length: 32, default: '' })
  lastName: string;

  constructor(data: Partial<AppleTempUserEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
