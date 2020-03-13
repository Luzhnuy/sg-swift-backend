import { Module } from '@nestjs/common';
import { VariablesService } from './services/variables.service';

@Module({
  providers: [
    VariablesService,
  ],
})
export class SharedModule {}
