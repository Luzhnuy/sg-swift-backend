import { Module } from '@nestjs/common';
import { VariablesService } from './services/variables.service';
import { SquareService } from './services/square.service';
import {TypeOrmModule} from '@nestjs/typeorm';
import {MerchantEntity} from '../merchants/entities/merchant.entity';
import {MerchantDepartmentEntity} from '../merchants/entities/merchant-department.entity';
import {MenuCategoryEntity} from '../merchants/entities/menu-category.entity';
import {MenuItemEntity} from '../merchants/entities/menu-item.entity';
import {MenuItemOptionEntity} from '../merchants/entities/menu-item-option.entity';
import {MenuOptionEntity} from '../merchants/entities/menu-option.entity';
import {MenuSubOptionEntity} from '../merchants/entities/menu-sub-option.entity';
import {UserEntity} from '../cms/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MerchantEntity,
      MerchantDepartmentEntity,
      MenuCategoryEntity,
      MenuItemEntity,
      MenuItemOptionEntity,
      MenuOptionEntity,
      MenuSubOptionEntity,
      UserEntity,
    ]),
  ],
  providers: [
    VariablesService,
    SquareService,
  ],
})
export class SharedModule {}
