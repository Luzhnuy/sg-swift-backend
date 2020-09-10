import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany, ManyToOne, Unique } from 'typeorm';
import { MapDistanceEntity } from './map-distance.entity';
import { DriversRolesName } from '../../drivers/providers/drivers-config';
import { CustomersRolesName } from '../../customers/providers/customers-config';
import { MerchantsRolesName } from '../../merchants/services/merchants-config.service';
import { ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { OrderEntity } from '../../orders/entities/order.entity';
import { PermissionKeys } from '../../orders/providers/orders-config';

@Entity()
@Unique(['countryCode', 'code'])
export class RegionEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column('varchar', { default: 'CA', nullable: false, length: 2 })
  public countryCode: string;

  @Column('varchar', { nullable: false, length: 2 })
  public code: string;

  @Column('varchar', { nullable: false, length: 32 })
  public name: string;

  constructor(data: Partial<RegionEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
