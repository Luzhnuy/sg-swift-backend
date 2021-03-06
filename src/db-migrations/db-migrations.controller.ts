import { Controller, Get } from '@nestjs/common';
import { DbMigrationsService } from './db-migrations.service';

@Controller('db-migrations')
export class DbMigrationsController {

  constructor(
    private dbMigrationsService: DbMigrationsService,
  ) {
  }

  @Get('run-migration')
  runMigration() {
    return this.dbMigrationsService
      .migrateV1();
  }

  @Get('update-default-merchant-menu-active')
  updateDefaultMerchantMenuActive() {
    return this.dbMigrationsService
      .migrateMerchantMenuActive();
  }
}
