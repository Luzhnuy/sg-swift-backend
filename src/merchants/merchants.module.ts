import {MiddlewareConsumer, Module} from '@nestjs/common';
import {CmsModule} from '../cms/cms.module';
import {MerchantEntity} from './entities/merchant.entity';
import {TypeOrmModule} from '@nestjs/typeorm';
import {MerchantsService} from './services/merchants.service';
import {MerchantsModuleService} from './services/merchants-module.service';
import {MerchantsConfigService} from './services/merchants-config.service';
import {MerchantsController} from './controllers/merchants.controller';
import {MerchantDepartmentEntity} from './entities/merchant-department.entity';
import {MenuCategoriesController} from './controllers/menu-categories.controller';
import {MenuItemsController} from './controllers/menu-items.controller';
import {SquareController} from './controllers/square.controller';
import {MenuCategoryEntity} from './entities/menu-category.entity';
import {MenuItemEntity} from './entities/menu-item.entity';
import {SettingsModule} from '../settings/settings.module';
import {SmsActivationModule} from '../sms-activation/sms-activation.module';
import {PaymentsModule} from '../payments/payments.module';
import {GeocoderModule} from '../geocoder/geocoder.module';
import {ElasticsearchModule} from '@nestjs/elasticsearch';
import {ItemsSearchService} from './services/items-search.service';
import {EmailDistributorModule} from '../email-distributor/email-distributor.module';
import {MenuItemOptionController} from './controllers/menu-item-option.controller';
import {MenuOptionsController} from './controllers/menu-options.controller';
import {MenuSubOptionsController} from './controllers/menu-sub-options.controller';
import {MenuItemOptionEntity} from './entities/menu-item-option.entity';
import {MenuOptionEntity} from './entities/menu-option.entity';
import {MenuSubOptionEntity} from './entities/menu-sub-option.entity';
import {MerchantsSearchService} from './services/merchants-search.service';
import {SquareService} from '../shared/services/square.service';
import {UserEntity} from '../cms/users/entities/user.entity';

@Module({
    imports: [
        CmsModule,
        ElasticsearchModule.register({
            node: 'http://localhost:9200',
        }),
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
        EmailDistributorModule,
        SettingsModule,
        SmsActivationModule,
        PaymentsModule,
        GeocoderModule,
    ],
    controllers: [MerchantsController, MenuCategoriesController, MenuItemsController,
        MenuItemOptionController, MenuOptionsController, MenuSubOptionsController, SquareController],
    providers: [MerchantsService, MerchantsModuleService, MerchantsConfigService, ItemsSearchService, MerchantsSearchService, SquareService],
    exports: [
        MerchantsService,
    ],
})
export class MerchantsModule {

    constructor(
        private merchantsModule: MerchantsModuleService,
    ) {
    }

    configure(consumer: MiddlewareConsumer) {
        this.merchantsModule.init();
    }
}
