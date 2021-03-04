import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import * as RequestParams from '@elastic/elasticsearch/api/requestParams';
import { MerchantEntity } from '../entities/merchant.entity';

@Injectable()
export class MerchantsSearchService {

  private readonly MerchantIndex = 'merchant';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  public async searchMerchants(query: string) {
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
            description : {
              boost : 5,
              value: q,
            },
          },
        },
      );
      shouldQuery.push(
        {
          fuzzy: {
            name : {
              boost : 1,
              value: q,
            },
          },
        },
      );
      if (q.length >= 2) {
        shouldQuery.push(
          {
            wildcard: {
              description : {
                boost : 2,
                value: `${q}*`,
              },
            },
          },
        );
        shouldQuery.push(
          {
            wildcard: {
              name : {
                boost : 1,
                value: `${q}*`,
              },
            },
          },
        );
      }
    });
    const { body } = await this.elasticsearchService
      .search({
        index: this.MerchantIndex,
        from: 0,
        size: 100,
        body: {
          query: {
            bool: {
              should: shouldQuery,
              filter: {
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

  public async registerMerchants(merchants: MerchantEntity | MerchantEntity[]) {
    merchants = Array.isArray(merchants) ? merchants : [ merchants ];
    for (const merchant of merchants) {
      const doc: RequestParams.Index<Partial<MerchantEntity>> = {
        id: merchant.id.toString(),
        index: this.MerchantIndex,
        // refresh: 'false',
        refresh: false,
        body: {
          id: merchant.id,
          isPublished: this.isMerchantPublished(merchant),
          name: merchant.name,
          description: merchant.description,
        },
      };
      await this.elasticsearchService
        .index(doc);
    }
    await this.elasticsearchService.indices.refresh({ index: this.MerchantIndex });
  }

  public async removeMerchants(ids: number[] | string[]) {
    for (const id of ids) {
      await this.elasticsearchService
        .delete({
          index: this.MerchantIndex,
          id: id.toString(),
        });
    }
  }

  public removeAllMerchants() {
    return this.elasticsearchService
      .deleteByQuery( {
        index: this.MerchantIndex,
        body: {
          query: {
            match_all: {},
            // range: {
            //   id: {
            //     gte: 1,
            //   },
            // },
          },
        },
      }, {}, (res) => {
        // console.log(res);
      });
  }

  private isMerchantPublished(merchant: MerchantEntity) {
    if (
      merchant.isPublished
      && merchant.enableMenu
    ) {
      return true;
    }
    return false;
  }
}
