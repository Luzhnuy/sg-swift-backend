import { Controller, Get } from '@nestjs/common';
import { MigrationService } from '../services/migration.service';

@Controller('migration')
export class MigrationController {

  constructor(
    private migrationService: MigrationService,
  ) {

  }

  @Get('')
  makeMigration() {
    return this.migrationService.migrate();
  }

}
