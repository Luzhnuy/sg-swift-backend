import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, OneToOne, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { MerchantDepartmentEntity } from './merchant-department.entity';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { MenuCategoryEntity } from './menu-category.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';

@Entity()
@OwnerFields(['userId'])
export class MerchantEntity extends ContentEntity {

  @OneToOne(type => UserEntity, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: number;

  @Column('varchar', { length: 48 })
  name: string;

  @Column('text', { nullable: true, default: null, comment: 'Merchant reference from the first version' })
  reference: string;

  @Column('text', { nullable: true, default: null })
  tagline: string;

  @Column('text', { nullable: true, default: null })
  description: string;

  @Column('text', { nullable: true, default: null })
  keywords: string;

  @Column('text', { nullable: true, default: null })
  website: string;

  @Column('text', { nullable: true, default: null })
  phone: string;

  @Column('text', { nullable: true, default: null })
  email: string;

  @Column('text', { nullable: true, default: null })
  logo: string;

  @Column('boolean', { default: true })
  enableBooking: boolean;

  @Column('boolean', { default: false })
  enableMenu: boolean;

  @Column('boolean', { default: false })
  menuActive: boolean;

  @Column('boolean', { default: false })
  isWaiting: boolean;

  // @Column('boolean', { default: false })
  // bringBack: boolean;

  @Column('boolean', { default: false })
  ageVerification: boolean;

  @Column('decimal', {
    precision: 7,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: ColumnNumericTransformer,
  })
  priceOverride: number = 0;

  @Column('mediumint', {
    nullable: false,
    default: 0,
  })
  distanceOverride: number;

  @Column('boolean', { default: true })
  subscribedOnReceipt: boolean;

  @Column('tinyint', {
    default: 0,
  })
  commission: number;

  @Column('mediumint', {
    default: 0,
  })
  maxDistance: number;

  @OneToMany(type => MerchantDepartmentEntity, department => department.merchant, {
    eager: true,
  })
  departments: MerchantDepartmentEntity[];

  @OneToMany(type => MenuCategoryEntity, category => category.merchant, {
    lazy: true,
  })
  categories: MenuCategoryEntity[];

  constructor(data: Partial<MerchantEntity>) {
    super();
    this.isPublished = false;
    if (data) {
      Object.assign(this, data);
    }
  }
}
