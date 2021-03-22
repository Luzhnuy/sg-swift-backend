import {Injectable} from '@nestjs/common';
import {MerchantEntity} from '../entities/merchant.entity';
import {Brackets, Repository} from 'typeorm';
import {InjectRepository} from '@nestjs/typeorm';
import {MenuItemEntity} from '../entities/menu-item.entity';
import {MenuOptionEntity} from '../entities/menu-option.entity';
import {MenuSubOptionEntity} from '../entities/menu-sub-option.entity';
import {MenuItemOptionEntity} from '../entities/menu-item-option.entity';
import {MenuCategoryEntity} from '../entities/menu-category.entity';
import {ItemsSearchService} from './items-search.service';
import {MerchantsSearchService} from './merchants-search.service';
import {Client, Environment} from 'square';

@Injectable()
export class MerchantsService {

    constructor(
        @InjectRepository(MerchantEntity)
        protected readonly repository: Repository<MerchantEntity>,
        @InjectRepository(MenuItemEntity)
        protected readonly menuItemEntityRepository: Repository<MenuItemEntity>,
        @InjectRepository(MenuCategoryEntity)
        protected readonly menuCategoryEntityRepository: Repository<MenuCategoryEntity>,
        @InjectRepository(MenuOptionEntity)
        protected readonly menuOptionEntityRepository: Repository<MenuOptionEntity>,
        @InjectRepository(MenuItemOptionEntity)
        protected readonly menuItemOptionEntityRepository: Repository<MenuItemOptionEntity>,
        @InjectRepository(MenuSubOptionEntity)
        protected readonly menuSubOptionEntityRepository: Repository<MenuSubOptionEntity>,
        private readonly itemsSearchService: ItemsSearchService,
        private readonly merchantsSearchService: MerchantsSearchService,
    ) {
    }

    async clearSearch() {
        return this.itemsSearchService
            .removeAll();
    }

    async clearMerchantsSearch() {
        return this.merchantsSearchService
            .removeAllMerchants();
    }

    async searchMenuItems(query: string, merchantId: string = null, isPublished = true) {
        return this.itemsSearchService
            .searchMenuItem(query, merchantId, isPublished);
    }

    async searchMerchants(query: string) {
        return this.merchantsSearchService
            .searchMerchants(query);
    }

    async migrateMenuItems(data: number[] | Partial<MenuItemEntity> = []) {
        const builder = await this.menuItemEntityRepository
            .createQueryBuilder('item')
            .select(['item.id', 'item.name', 'item.description', 'item.isPublished', 'item.isWaiting',
                'merchant.isPublished', 'merchant.enableMenu', 'category.isPublished', 'item.categoryId', 'item.merchantId'])
            .innerJoin('item.category', 'category')
            .innerJoin('item.merchant', 'merchant');
        if (data) {
            if (Array.isArray(data)) {
                if (data.length) {
                    builder.whereInIds(data);
                }
            } else {
                const keys = Object.keys(data);
                builder.where(new Brackets(sqb => {
                    keys.forEach((field, i) => {
                        sqb.where(`item.${field} = :${field}`, data);
                    });
                    return sqb;
                }));
            }
        }
        const allItems = await builder.getMany();
        return await this.itemsSearchService.registerMenuItems(allItems);
    }

    async migrateMerchants() {
        const builder = await this.repository
            .createQueryBuilder('merchant')
            .select(['merchant.id', 'merchant.name', 'merchant.description', 'merchant.isPublished', 'merchant.enableMenu']);
        const result = await builder
            .getMany();
        return await this.merchantsSearchService.registerMerchants(result);
    }

    async removeSearchItems(data: number[] | Partial<MenuItemEntity> = []) {
        const builder = await this.menuItemEntityRepository
            .createQueryBuilder('item')
            .select([
                'item.id']);
        if (data) {
            if (Array.isArray(data)) {
                if (data.length) {
                    builder.whereInIds(data);
                }
            } else {
                const keys = Object.keys(data);
                builder.where(new Brackets(sqb => {
                    keys.forEach((field, i) => {
                        sqb.where(`item.${field} = :${field}`, data);
                    });
                    return sqb;
                }));
            }
        }
        const allItems = await builder.getMany();
        const ids = allItems.map(item => item.id);
        return await this.itemsSearchService.removeMenuItems(ids);
    }

    getMerchantByUserId(userId) {
        return this.repository.findOne({
            userId,
        });
    }

    get(params) {
        return this.repository.findOne(params);
    }

    getSingleById(id: number) {
        return this.repository.findOne({id});
    }

}
