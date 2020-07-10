import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class SettingsEntity {

  @PrimaryColumn('varchar', { length: 64, nullable: false })
  key: string;

  @Column('text', { nullable: false })
  value: string;

  @Column('text', { nullable: true, default: null })
  comment: string;

  @Column('boolean', { default: false })
  isDefault: boolean;

  constructor(data: Partial<SettingsEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }

}
