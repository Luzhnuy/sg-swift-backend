import { Module } from '@nestjs/common';
import { SchedulerService } from './services/scheduler.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerTaskEntity } from './entities/scheduler-task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SchedulerTaskEntity,
    ]),
  ],
  providers: [
    SchedulerService,
  ],
  exports: [
    SchedulerService,
  ],
})
export class SchedulerModule {}
