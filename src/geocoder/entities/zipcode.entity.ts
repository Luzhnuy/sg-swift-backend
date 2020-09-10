import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne, Unique, ManyToMany, OneToMany } from 'typeorm';
import { RegionEntity } from './region.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';
import { ZipcodesListEntity } from './zipcodes-list.entity';
import { ZipcodesDistanceAssocEntity } from './zipcodes-distance-assoc.entity';
import { PermissionRoleEntity } from '../../cms/roles-and-permissions/entities/permission-role.entity';

@Entity()
@Unique(['regionId', 'zipcode'])
export class ZipcodeEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(type => RegionEntity, {
    onDelete: 'CASCADE',
    nullable: false,
    eager: false,
    cascade: false,
  })
  @JoinColumn()
  region: RegionEntity;

  @Column()
  regionId: number;

  @OneToMany(type => ZipcodesDistanceAssocEntity, zda => zda.sourceZipcode, {
    lazy: true,
  })
  @JoinColumn()
  zipcodesDistanceAssoc: PermissionRoleEntity[];

  @Column('varchar', { nullable: false, length: 3 })
  zipcode: string;

  @Column('decimal', { precision: 12, scale: 8, nullable: false, transformer: ColumnNumericTransformer })
  latitude: null | number;

  @Column('decimal', { precision: 12, scale: 8, nullable: false, transformer: ColumnNumericTransformer })
  longitude: null | number;

  constructor(data: Partial<ZipcodeEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
