import { Controller, Get, Query } from '@nestjs/common';
import { CrudEntity } from '../../../cms/content/decorators/crud-controller.decorator';
import { CollaborationRequestEntity } from '../../entities/collaboration-request.entity';
import { CrudController } from '../../../cms/content/controllers/crud-controller';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolesAndPermissionsService } from '../../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper } from '../../../cms/roles-and-permissions/misc/content-permission-helper';
import { User } from '../../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../../cms/users/entities/user.entity';

@Controller('collaboration-request')
@CrudEntity(CollaborationRequestEntity)
export class CollaborationRequestController  extends CrudController {

  constructor(
    @InjectRepository(CollaborationRequestEntity)
    protected readonly repository: Repository<CollaborationRequestEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('count')
  async countOrders(@User() user: UserEntity, @Query() query: any) {
    const builder = await this.getQueryBuilder(user, query);
    return builder.getCount();
  }

}
