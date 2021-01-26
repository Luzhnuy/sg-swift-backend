import { Body, Controller, Delete, Get, Param, Put, Query, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { MenuCategoryEntity } from '../entities/menu-category.entity';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { MerchantEntity } from '../entities/merchant.entity';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { ContentEntityParam } from '../../cms/content/decorators/content-entity-param.decorator';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { MerchantsService } from '../services/merchants.service';

@Controller('menu-categories')
@CrudEntity(MenuCategoryEntity)
export class MenuCategoriesController extends CrudController {
  constructor(
    @InjectRepository(MenuCategoryEntity)
      protected readonly repository: Repository<MenuCategoryEntity>,
    @InjectRepository(MerchantEntity)
      protected readonly repositoryMerchants: Repository<MerchantEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    private readonly merchantsService: MerchantsService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('')
  async loadContentEntities(@User() user: UserEntity, @Query() query: any) {
    const builder = await this.getQueryBuilder(user, query);
    return builder.getMany();
  }

  @Get('lite')
  async loadContentEntitiesLite(@User() user: UserEntity, @Query() query: any) {
    const builder = await this.getQueryBuilderLite(user, query);
    return builder.getMany();
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
    @ContentEntityParam() currentEntity: ContentEntity,
    @Body() newEntity: ContentEntity,
  ) {
    const result = await super.updateContentEntity(user, currentEntity, newEntity);
    this.merchantsService.migrateMenuItems({
      categoryId: currentEntity.id,
    });
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
    await this.merchantsService.removeSearchItems({ categoryId: id });
    return await this.repository.remove(entity);
  }

  protected async getQueryBuilder(user, query) {
    delete query.hasCreditCard;
    const builder = await super.getQueryBuilder(user, query);
    builder
      .leftJoinAndSelect('entity.items', 'items');
    const secureWhere = await this.getWhereRestrictionsByPermissions(user);
    if (secureWhere && secureWhere.isPublished) {
      // builder.andWhere('items.isPublished = :isPublished', { isPublished: true });
      builder.andWhere('items.isWaiting = :isWaiting', { isWaiting: false });
      builder.innerJoinAndSelect('entity.merchant', 'merchant');
      builder.andWhere('merchant.isPublished = :isPublished', { isPublished: true });
      builder.andWhere('merchant.enableMenu = :menuEnabled', { menuEnabled: true });
    }
    return builder;
  }

  protected async getQueryBuilderLite(user, query) {
    delete query.hasCreditCard;
    const loadEmpty = query.loadEmpty;
    delete query.loadEmpty;
    const builder = await super.getQueryBuilder(user, query);
    if (loadEmpty) {
      builder
        .leftJoin('entity.items', 'items');
    } else {
      builder
        .innerJoin('entity.items', 'items');
    }
    const secureWhere = await this.getWhereRestrictionsByPermissions(user);
    if (secureWhere && secureWhere.isPublished) {
      // builder.andWhere('items.isPublished = :isPublished', { isPublished: true });
      builder.andWhere('items.isWaiting = :isWaiting', { isWaiting: false });
      builder.innerJoin('entity.merchant', 'merchant');
      builder.andWhere('merchant.isPublished = :isPublished', { isPublished: true });
      builder.andWhere('merchant.enableMenu = :menuEnabled', { menuEnabled: true });
    }
    builder.loadRelationCountAndMap('entity.itemsCount', 'entity.items');
    builder.take(100);
    builder.skip(0);
    return builder;
  }
}
