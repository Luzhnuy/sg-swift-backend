import { MiddlewareConsumer, Module } from '@nestjs/common';
import { FavoritesConfig } from './providers/favorites-config';
import { FavoritesModuleService } from './services/favorites-module.service';
import { CmsModule } from '../cms/cms.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { CustomersModule } from '../customers/customers.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteEntity } from './entities/favorite.entity';
import { FavoritesController } from './controllers/favorites.controller';

@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      FavoriteEntity,
    ]),
    MerchantsModule,
    CustomersModule,
  ],
  providers: [FavoritesConfig, FavoritesModuleService],
  controllers: [FavoritesController],
})
export class FavoritesModule {
  constructor(
    private moduleService: FavoritesModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.moduleService.init();
  }
}
