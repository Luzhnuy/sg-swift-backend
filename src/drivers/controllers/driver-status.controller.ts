import { Body, Controller, Post, Put, Query, UnprocessableEntityException, UseGuards, Headers, Get, Param } from '@nestjs/common';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { DriverStatusEntity } from '../entities/driver-status.entity';
import { Repository } from 'typeorm';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { InjectRepository } from '@nestjs/typeorm';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ContentEntityParam } from '../../cms/content/decorators/content-entity-param.decorator';
import { DriversService } from '../services/drivers.service';
import { DriverOnlineEntity } from '../entities/driver-online.entity';

@Controller('driver-status')
@CrudEntity(DriverStatusEntity)
export class DriverStatusController extends CrudController {

  constructor(
    @InjectRepository(DriverStatusEntity)
    protected readonly repository: Repository<DriverStatusEntity>,
    @InjectRepository(DriverOnlineEntity)
    protected readonly repositoryOnline: Repository<DriverOnlineEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    protected driversService: DriversService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('driverId/:id')
  async getStatusByDriverId(
    @User() user: UserEntity,
    @Param('id') driverId: number,
  ) {
    return this.repository
      .createQueryBuilder('status')
      .innerJoinAndSelect('status.profile', 'profile')
      .where('profile.id = :driverId', { driverId })
      .getOne();
  }

  // TODO check if decorators guards are necessary
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
    @ContentEntityParam() currentEntity: DriverStatusEntity,
    @Body() newEntity: DriverStatusEntity,
    @Headers() headers?: any,
  ) {
    if (
      typeof newEntity.isOnline === 'boolean'
      && newEntity.isOnline !== currentEntity.isOnline
    ) {
      const localTimestamp = (new Date()).getTime() - (headers['x-timezone-offset'] ? headers['x-timezone-offset'] * 60000 : 0);
      const localDate = new Date(localTimestamp);
      localDate.setHours(0, 0, 0, 0);
      localDate.setTime(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
      let latestOnline = await this.repositoryOnline.findOne({
        userId: user.id,
        endDatetime: null,
        workingDate: localDate,
      });
      if (newEntity.isOnline) {
        if (latestOnline) {
          await this.repositoryOnline.remove([latestOnline]);
        }
        latestOnline = new DriverOnlineEntity( {
          authorId: user.id,
          moderatorId: user.id,
          userId: user.id,
          workingDate: localDate,
          startDatetime: new Date(localTimestamp),
          timezoneOffset: headers['x-timezone-offset'] ? headers['x-timezone-offset'] : 0,
        });
      } else if (latestOnline) {
        latestOnline.endDatetime = new Date(localTimestamp);
      }
      if (latestOnline) {
        await this.repositoryOnline.save(latestOnline);
      }
    }
    if (!newEntity.isOnline === false) {
      newEntity.latitude = null;
      newEntity.longitude = null;
    }
    const status = await super.updateContentEntity(user, currentEntity, newEntity);
    this.driversService.emitDriverStatusUpdate(status);
    return status;
  }

  @Post('update-location/:id')
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEditOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEdit];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  async updateLocation(@Body() body: any, @User() user: UserEntity, @ContentEntityParam() currentEntity: DriverStatusEntity) {
    const newEntity = new DriverStatusEntity(currentEntity);
    newEntity.latitude = body[0].latitude;
    newEntity.longitude = body[0].longitude;
    const status = await super.updateContentEntity(user, currentEntity, newEntity);
    this.driversService.emitDriverStatusUpdate(status);
    return status;
  }
}
