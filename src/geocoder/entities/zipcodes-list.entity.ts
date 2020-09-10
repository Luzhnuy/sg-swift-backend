import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne, Unique, ManyToMany, OneToMany, RelationId, JoinTable } from 'typeorm';
import { RegionEntity } from './region.entity';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';
import { ZipcodeEntity } from './zipcode.entity';
import { MenuSubOptionEntity } from '../../merchants/entities/menu-sub-option.entity';
import { PaymentMethods } from '../../orders/entities/order-metadata.entity';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { ContentEntity } from '../../cms/content/entities/content.entity';

export enum ZipcodeListType {
  Customers = 'customers',
  Merchants = 'merchants',
}

@Entity()
export class ZipcodesListEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToMany(type => ZipcodeEntity, {
    lazy: true,
    cascade: true,
  })
  @JoinTable()
  zipcodes: ZipcodeEntity[];

  @RelationId((zipcodesList: ZipcodesListEntity) => zipcodesList.zipcodes)
  zipcodesIds: number[];

  @Column('enum', { enum: ZipcodeListType, nullable: false })
  type: ZipcodeListType;

  constructor(data: Partial<ZipcodesListEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
