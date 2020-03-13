import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { MenuItemEntity } from '../entities/menu-item.entity';
import * as RequestParams from '@elastic/elasticsearch/api/requestParams';

@Injectable()
export class ItemsSearchService {

  private readonly MenuItemIndex = 'menu-item';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  public async searchMenuItem(query: string) {
    const queryParts = query
      .trim()
      .toLowerCase()
      .replace(/\s+/, ' ')
      .split(' ');
    const shouldQuery = [];
    queryParts.forEach(q => {
      shouldQuery.push(
        {
          fuzzy: {
            name : {
              boost : 2,
              value: q,
            },
          },
        },
      );
      shouldQuery.push(
        {
          fuzzy: {
            description : {
              value: q,
            },
          },
        },
      );
    });
    const { body } = await this.elasticsearchService
      .search({
        index: this.MenuItemIndex,
        from: 0,
        size: 100,
        body: {
          query: {
            bool: {
              should: shouldQuery,
              must: {
                term: {
                  isPublished: true,
                },
              },
              minimum_should_match : 1,
            },
          },
        },
      });
    return body.hits.hits;
  }

  public async registerMenuItems(items: MenuItemEntity | MenuItemEntity[]) {

    items = Array.isArray(items) ? items : [ items ];
    for (const item of items) {
      const doc: RequestParams.Index<Partial<MenuItemEntity>> = {
        id: item.id.toString(),
        index: this.MenuItemIndex,
        refresh: 'false',
        body: {
          id: item.id,
          isPublished: this.isMenuItemPublished(item),
          name: item.name,
          description: item.description,
        },
      };
      await this.elasticsearchService
        .index(doc);
    }
    await this.elasticsearchService.indices.refresh({ index: this.MenuItemIndex });
  }

  public async removeMenuItems(ids: number[] | string[]) {
    for (const id of ids) {
      await this.elasticsearchService
        .delete({
          index: this.MenuItemIndex,
          id: id.toString(),
        });
    }
  }

  private isMenuItemPublished(menuItem: MenuItemEntity) {
    if (
      !menuItem.isWaiting
      && menuItem.isPublished
      && (menuItem as any).__category__.isPublished
      && menuItem.merchant.isPublished
      && menuItem.merchant.enableMenu
    ) {
      return true;
    }
    return false;
  }
}
