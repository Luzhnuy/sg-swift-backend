import { HttpModule, Module } from '@nestjs/common';
import { MigrationService } from './services/migration.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Accounts } from './entities/Accounts';
import { Categories } from './entities/Categories';
import { EmailSubscriptions } from './entities/EmailSubscriptions';
import { Historyorders } from './entities/Historyorders';
import { Menus } from './entities/Menus';
import { OrdersInfo } from './entities/OrdersInfo';
import { Stripecustomers } from './entities/Stripecustomers';
import { Users } from './entities/Users';
import { MigrationController } from './controller/migration.controller';
import { CmsModule } from '../cms/cms.module';
import { UserEntity } from '../cms/users/entities/user.entity';
import { MerchantEntity } from '../merchants/entities/merchant.entity';
import { MenuCategoryEntity } from '../merchants/entities/menu-category.entity';
import { MenuItemEntity } from '../merchants/entities/menu-item.entity';
import { GeocoderModule } from '../geocoder/geocoder.module';
import { MerchantDepartmentEntity } from '../merchants/entities/merchant-department.entity';
import { PaymentCardEntity } from '../payments/entities/payment-card.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { CustomerMetadataEntity } from '../customers/entities/customer-metadata.entity';
import { CustomerDeviceInfoEntity } from '../customers/entities/customer-device-info.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderMetadataEntity } from '../orders/entities/order-metadata.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { Environment } from '../environment';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: 'oldDatabaseConn',
      type: Environment.mysql.type,
      host: Environment.mysql.host,
      port: Environment.mysql.port,
      username: Environment.mysql.username,
      password: Environment.mysql.password,
      database: Environment.mysql.databaseOld,
      entities: [__dirname + '/entities/*{.ts,.js}'],
      synchronize: Environment.mysql.synchronize,
    }),
    TypeOrmModule.forFeature([
      Accounts,
      Categories,
      EmailSubscriptions,
      Historyorders,
      // Jobs,
      Menus,
      OrdersInfo,
      Stripecustomers,
      Users,
    ], 'oldDatabaseConn'),
    TypeOrmModule.forFeature([
      UserEntity,
      MerchantEntity,
      MenuCategoryEntity,
      MenuItemEntity,
      MerchantDepartmentEntity,
      PaymentCardEntity,
      CustomerEntity,
      CustomerMetadataEntity,
      CustomerDeviceInfoEntity,
      OrderEntity,
      OrderMetadataEntity,
      OrderItemEntity,
    ]),
    HttpModule,
    CmsModule,
    GeocoderModule,
  ],
  providers: [
    MigrationService,
  ],
  controllers: [MigrationController],
})
export class OldDatabaseModule {}
