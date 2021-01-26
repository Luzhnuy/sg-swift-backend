import { Body, Controller, Delete, Get, Param, Post, Put, Query, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { MenuItemEntity } from '../entities/menu-item.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ContentEntityParam } from '../../cms/content/decorators/content-entity-param.decorator';
import { MerchantEntity } from '../entities/merchant.entity';
import { RolesAndPermissionsRolesName } from '../../cms/roles-and-permissions/services/roles-and-permissions-config.service';
import { MerchantsService } from '../services/merchants.service';

@Controller('menu-items')
@CrudEntity(MenuItemEntity)
export class MenuItemsController extends CrudController {

  constructor(
    @InjectRepository(MenuItemEntity)
    protected readonly repository: Repository<MenuItemEntity>,
    @InjectRepository(MerchantEntity)
    protected readonly repositoryMerchants: Repository<MerchantEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    private merchantsService: MerchantsService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('registerSearch')
  registerSearch() {
    return this.merchantsService
      .migrateMenuItems();
  }

  @Get('resetSearch')
  resetSearch() {
    return this.merchantsService
      .clearSearch();
  }

  @Get('doSearch')
  doSearch(
    @Query('query') query: string,
  ) {
    return this.merchantsService.searchMenuItems(query);
  }

  @Get('')
  async loadMenuItems(
    @User() user: UserEntity,
    @Query() query,
  ) {
    if (query.query) {
      const secureWhere = await this.getWhereRestrictionsByPermissions(user);
      const isPublished = !!(secureWhere && secureWhere.isPublished);
      const hits: any[] = await this.merchantsService.searchMenuItems(query.query, query.merchantId, isPublished);
      if (hits.length === 0) {
        return [];
      }
      const itemsIds: number[] = hits.map(hit => hit._source.id);
      query.query = null;
      delete query.query;
      const builder = await this.getQueryBuilder(user, query);
      builder.select('entity');
      builder.andWhere('entity.id IN (:...ids)', { ids: itemsIds });
      builder.take(hits.length);
      let items = await builder.getMany();
      const itemsAssoc = {};
      items.forEach(item => {
        itemsAssoc[item.id] = item;
      });
      items = [];
      hits.forEach(hit => {
        const item = itemsAssoc[parseInt(hit._source.id, 10)];
        if (item) {
          delete item.merchant;
          items.push(item);
        }
      });
      return items;
    } else {
      const builder = await this.getQueryBuilder(user, query);
      return builder.getMany();
    }
  }

  @Post('')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  async createContentEntity(@Body() entity: MenuItemEntity, @User() user: UserEntity) {
    const image = entity.image;
    entity.image = null;
    this.setIsWaiting(entity, user, true);
    entity = await super.createContentEntity(entity, user) as MenuItemEntity;
    if (image) {
      entity.image = image;
      entity.image = this.createImage(entity);
      entity = await this.repository.save(entity);
    }
    await this.updateMerchantIsWaiting(entity);
    this.merchantsService.migrateMenuItems([ entity.id ]);
    return entity;
  }

  @Put(':id')
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEditOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEdit];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  async updateContentEntity(
    @User() user: UserEntity,
    @ContentEntityParam() currentEntity: MenuItemEntity,
    @Body() newEntity: MenuItemEntity,
  ) {
    if (newEntity.image) {
      newEntity.image = this.createImage(newEntity);
    } else if (newEntity.image === null) {
      if (currentEntity.image) {
        const imgPath = currentEntity.image.replace('/', '');
        fs.unlink(imgPath, () => null);
      }
    }
    this.setIsWaiting(newEntity, user, newEntity.isWaiting);
    const result = await super.updateContentEntity(user, currentEntity, newEntity) as MenuItemEntity;
    await this.updateMerchantIsWaiting(result);
    this.merchantsService.migrateMenuItems([ currentEntity.id ]);
    return result;
  }

  @Delete(':id')
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentRemoveOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentRemove];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  async deleteContentEntity(@Param('id') id: number) {
    const entity = await this.repository.findOne({ id });
    await this.merchantsService.removeSearchItems([ id ]);
    const res = await this.repository.remove(entity);
    entity.isWaiting = false;
    await this.updateMerchantIsWaiting(entity);
    // TODO delete content entity from elasticsearch
    return res;
  }

  private createImage(entity: MenuItemEntity) {
    const jpegStartStr = 'data:image/jpeg;base64,';
    const pngStartStr = 'data:image/png;base64,';
    const isJpeg = entity.image.startsWith(jpegStartStr);
    const isPng = entity.image.startsWith(pngStartStr);
    if (!isJpeg && !isPng) {
      throw new UnprocessableEntityException('Image format is wrong');
    }
    const ext = isJpeg ? '.jpg' : '.png';
    const { path, fileName } = this.getFileName(entity.id, ext);
    const data = isJpeg ? entity.image.replace(jpegStartStr, '') : entity.image.replace(pngStartStr, '');
    try {
      fs.readdirSync(path);
    } catch (e) {
      fs.mkdirSync(path, { recursive: true });
    }
    const filePath = `${path}/${fileName}`;
    fs.writeFileSync(filePath, data, 'base64');
    return `/${filePath}`;
  }

  private getFileName(id: number | string, ext: string) {
    const path = 'uploads/menu-items/image';
    const fileName = 'menu-item-' + id + ext;
    return { path, fileName };
  }

  private setIsWaiting(menuItem: MenuItemEntity, user: UserEntity, def) {
    // TODO check permission correctly in the future
    const isNotAdmin = !user.roles.find(role => role.name === RolesAndPermissionsRolesName.Admin);
    if (isNotAdmin) {
      menuItem.isWaiting = def;
    } else {
      menuItem.isWaiting = false;
    }
  }

  protected async getQueryBuilder(user, query) {
    const limit = query.limit;
    const offset = query.offset;
    const orderBy = query.orderBy;
    const orderDirection = query.orderDirection;
    query.limit = null;
    query.offset = null;
    query.orderBy = null;
    query.orderDirection = null;
    delete query.limit;
    delete query.offset;
    delete query.orderBy;
    delete query.orderDirection;
    let searchQuery: string = query.query ? query.query.trim() : null;
    delete query.query;
    const builder = await super.getQueryBuilder(user, query);
    const secureWhere = await this.getWhereRestrictionsByPermissions(user);
    if (secureWhere && secureWhere.isPublished) {
      builder.andWhere('entity.isWaiting = :isWaiting', { isWaiting: false });
      // builder.andWhere('entity.isPublished = :isPublished', { isPublished: true });
      builder.innerJoinAndSelect('entity.merchant', 'merchant');
      builder.andWhere('merchant.isPublished = :isPublished', { isPublished: true });
      builder.andWhere('merchant.enableMenu = :menuEnabled', { menuEnabled: true });
    }
    if (searchQuery) {
      const searchQueryParts = searchQuery.split(' ')
        .map((part, i) => {
          if (part.length >= (i === 0 ? 3 : 4 )) {
            return part + '*';
          } else {
            return part;
          }
        });
      const searchQueries = searchQueryParts.join(' ');
      searchQuery = `(${searchQuery}) (${searchQueries})`;
      builder.andWhere(`MATCH(entity.name) AGAINST (:searchQuery IN BOOLEAN MODE)`, { searchQuery });
    }
    if (limit && limit < 200) {
      builder.take(limit);
    }
    if (offset) {
      builder.skip(offset);
    }
    if (orderBy && orderDirection) {
      builder.orderBy(orderBy, orderDirection.toUpperCase());
    }
    return builder;
  }

  private async updateMerchantIsWaiting(entity: MenuItemEntity) {
    const builder = this.repository
      .createQueryBuilder('menu');
    builder.innerJoinAndSelect('menu.merchant', 'merchant');
    builder.where('menu.merchantId = :merchantId', { merchantId: entity.merchantId });
    if (entity.isWaiting) {
      builder.andWhere('merchant.isWaiting = :isWaiting', { isWaiting: false });
      const menu = await builder.getOne();
      if (menu) {
        const merchant = menu.merchant;
        merchant.isWaiting = true;
        await this.repositoryMerchants.save(merchant);
      }
    } else {
      builder.andWhere('menu.isWaiting = :isWaiting', { isWaiting: true });
      const menu = await builder.getOne();
      if (menu) {
        const merchant = menu.merchant;
        if (!merchant.isWaiting) {
          merchant.isWaiting = true;
          await this.repositoryMerchants.save(merchant);
        }
      } else {
        const merchant = await this.repositoryMerchants.findOne({
          id: entity.merchantId,
          isWaiting: true,
        });
        if (merchant) {
          merchant.isWaiting = false;
          await this.repositoryMerchants.save(merchant);
        }
      }
    }
  }
}
