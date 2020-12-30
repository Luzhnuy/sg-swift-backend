import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CollaborationRequestController } from './controllers/collaboration-request/collaboration-request.controller';
import { CollaborationRequestsService } from './services/collaboration-requests.service';
import { CollaborationRequestsConfig } from './providers/collaboration-requests-config';
import { CollaborationRequestsModuleService } from './services/collaboration-requests-module.service';
import { CmsModule } from '../cms/cms.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailDistributorModule } from '../email-distributor/email-distributor.module';
import { CollaborationRequestEntity } from './entities/collaboration-request.entity';

@Module({
  imports: [
    CmsModule,
    TypeOrmModule.forFeature([
      CollaborationRequestEntity,
    ]),
    EmailDistributorModule,
  ],
  controllers: [
    CollaborationRequestController,
  ],
  providers: [
    CollaborationRequestsService,
    CollaborationRequestsConfig,
    CollaborationRequestsModuleService,
  ],
})
export class CollaborationRequestsModule {
  constructor(
    private collaborationRequestsModule: CollaborationRequestsModuleService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    this.collaborationRequestsModule.init();
  }
}
