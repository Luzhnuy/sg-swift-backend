import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, OneToOne, Index } from 'typeorm';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { MerchantDepartmentEntity } from './merchant-department.entity';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { MenuCategoryEntity } from './menu-category.entity';
import { OwnerFields } from '../../cms/roles-and-permissions/decorators/owner-fields.decorator';

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
  isWaiting: boolean;

  @Column('boolean', { default: true })
  subscribedOnReceipt: boolean;

  @OneToMany(type => MerchantDepartmentEntity, department => department.merchant, {
    eager: true,
    cascade: ['update'],
  })
  departments: MerchantDepartmentEntity[];

  @OneToMany(type => MenuCategoryEntity, category => category.merchant, {
    lazy: true,
    cascade: ['update'],
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
