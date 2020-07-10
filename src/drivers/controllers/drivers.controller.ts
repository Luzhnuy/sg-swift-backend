import {
  Body,
  Controller,
  Get, Header,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Put, Query, UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { Repository } from 'typeorm';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { DriverProfileEntity } from '../entities/driver-profile.entity';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { UsersService } from '../../cms/users/services/users.service';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { ContentEntityParam } from '../../cms/content/decorators/content-entity-param.decorator';
import { DriverStatusEntity } from '../entities/driver-status.entity';
import { DriversRolesName } from '../providers/drivers-config';
import { DriversService } from '../services/drivers.service';
import { DriverOnlineEntity } from '../entities/driver-online.entity';
import { PermissionsGuard } from '../../cms/roles-and-permissions/guards/permissions.guard';
import { UsersPermissionsKeys } from '../../cms/users/services/users-config.service';
import { SanitizeUser, SanitizeUsers } from '../../cms/users/decorators/sanitize-user.decorator';

interface DriverReportItem {
  workingDate: Date;
  driverName: string;
  totalTime: number;
  onlineTime: number;
  offlineTime: number;
}

@Controller('drivers')
@CrudEntity(DriverProfileEntity)
export class DriversController extends CrudController {

  constructor(@InjectRepository(DriverProfileEntity)
              protected readonly repository: Repository<DriverProfileEntity>,
              @InjectRepository(DriverStatusEntity)
              protected readonly statusRepository: Repository<DriverStatusEntity>,
              @InjectRepository(DriverOnlineEntity)
              protected readonly onlineRepository: Repository<DriverOnlineEntity>,
              protected rolesAndPermissions: RolesAndPermissionsService,
              protected contentPermissionsHelper: ContentPermissionHelper,
              private usersService: UsersService,
              private driversService: DriversService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('')
  @SanitizeUsers('user')
  async loadContentEntities(@User() user: UserEntity, @Query() query) {
    const builder = await this.getQueryBuilder(user, query);
    return builder.getMany();
  }

  @Post('')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  // @UseGuards(PermissionsGuard(() => UsersPermissionsKeys.CreateDelegatedUsers))
  @SanitizeUser('user')
  async createContentEntity(@Body() driver: DriverProfileEntity, @User() user: UserEntity) {
    const isNewUser = !driver.user.id;
    try {
      driver.user = await this.usersService
        .addRoleIfAbsent(driver.user, DriversRolesName.Driver);
      if (isNewUser) {
        driver.user = await this.usersService
          .createUser(driver.user);
          // .createDelegatedUser(driver.user, user);
      }
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        // TODO i18n
        throw new UnprocessableEntityException('Email already exists');
      } else {
        throw new InternalServerErrorException(e.toString());
      }
    }
    driver.userId = driver.user.id;
    driver.status = new DriverStatusEntity({
      authorId: driver.userId,
      moderatorId: driver.userId,
      isPublished: true,
    });
    let newDriver;
    try {
      newDriver = await super.createContentEntity(driver, user);
    } catch (e) {
      if (isNewUser) {
        await this.usersService.removeUser(driver.userId);
      }
      // TODO handle error
      return e;
    }
    // BUG when using << cascade: ["insert"] >> https://github.com/typeorm/typeorm/issues/4090
    const toRet = await this.repository.findOne({
      email: newDriver.email,
    });
    this.driversService.emitDriverUpdate(toRet);
    return toRet;
  }

  @Put(':id')
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEditOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEdit];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  @SanitizeUser('user')
  async updateContentEntity(
    @User() user: UserEntity,
    @ContentEntityParam() currentEntity: DriverProfileEntity,
    @Body() driver: DriverProfileEntity,
  ) {
    try {
      if (!driver.user) {
        driver.user = currentEntity.user;
      }
      driver.userId = driver.user.id;
      if (!driver.user.isActive && driver.status.isOnline) {
        driver.status.isOnline = false;
      }
      const isStatusDifferent = driver.user.isActive !== currentEntity.user.isActive;
      const toRet = await super.updateContentEntity(user, currentEntity, driver);
      if (isStatusDifferent) {
        this.driversService.emitDriverUpdate(driver);
      }
      return toRet;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        throw new UnprocessableEntityException('Email already exists');
      } else {
        throw new InternalServerErrorException(e.toString());
      }
    }
  }

  @Get('me')
  @SanitizeUser('user')
  async getDriverInfo(@User() user: UserEntity) {
    const secureWhere = await this.getWhereRestrictionsByPermissions(user);
    if (secureWhere === false) {
      throw new UnauthorizedException();
    }
    const driver = await  this.repository.findOne({
      where: secureWhere,
      relations: [ 'status', 'user' ],
    });
    if (!driver) {
      throw new NotFoundException();
    }
    driver.user = user;
    return driver;
  }

  @Get('reports')
  @Header('content-type', 'application/octet-stream')
  @Header('content-disposition', 'attachment; filename="drivers-reports.csv"')
  // TODO add permissions
  async sendReport(@User() user: UserEntity, @Query() query: any) {
    const builder = this.onlineRepository
      .createQueryBuilder('do')
      .select('do.userId')
      .addSelect('do.workingDate')
      .addSelect('SUM(TIMESTAMPDIFF(SECOND, do.startDatetime, do.endDatetime))', 'secondsOnline')
      .addSelect('MAX(do.endDatetime)', 'maxDatetime')
      .addSelect('MIN(do.startDatetime)', 'minDatetime')
      .groupBy('do.workingDate')
      .addGroupBy('do.userId')
      .orderBy('do.workingDate', 'ASC')
      .leftJoinAndSelect(DriverProfileEntity, 'driver', 'driver.userId = do.userId');
    if (query.range) {
      if (typeof query.range === 'string') {
        query.range = query.range.split(',').map(dateStr => new Date(dateStr));
      }
      if (query.range.length === 2) {
        builder
          .andWhere(`do.workingDate BETWEEN :start AND :end`,
            {
              start: query.range[0],
              end: query.range[1],
            });
      }
    }
    const res = await builder.getRawMany();
    const data: DriverReportItem[] = res.map((resItem: {
      do_workingDate: string;
      driver_firstName: string;
      driver_lastName: string;
      secondsOnline: number;
      maxDatetime: string;
      minDatetime: string;
    }) => {
      const startTS = (new Date(resItem.minDatetime)).getTime();
      const endTS = (new Date(resItem.maxDatetime)).getTime();
      const totalTime = endTS - startTS;
      const onlineTime = resItem.secondsOnline * 1000;
      const offlineTime = totalTime - onlineTime;
      return {
        workingDate: new Date(resItem.do_workingDate),
        driverName: resItem.driver_firstName + ' ' + resItem.driver_lastName,
        totalTime,
        onlineTime,
        offlineTime,
      };
    });
    return this.convertDataToCSV(data);
  }

  protected async getQueryBuilder(user: UserEntity, query: any) {
    const builder = await super.getQueryBuilder(user, query);
    builder.leftJoinAndSelect('entity.status', 'status');
    builder.leftJoinAndSelect('entity.user', 'user');
    return builder;
  }

  private convertDataToCSV(data: DriverReportItem[]) {
    let rows = [
      [ 'Date', 'Driver Name', 'Online Time', 'Offline Time', 'Total Time' ],
    ];
    rows = [
      ...rows,
      ...data.map((item: DriverReportItem) => {
        return [
          item.workingDate.toISOString().replace(/T.+/, ''),
          item.driverName,
          this.formatTime(item.onlineTime),
          this.formatTime(item.offlineTime),
          this.formatTime(item.totalTime),
        ];
      }),
    ];
    return this.arraysToCSV(rows);
  }

  private arraysToCSV(arrs) {
    return arrs.map(arr => {
      return '"' + arr
        .map(el => {
          if (typeof el === 'string') {
            return el.replace(/"/g, '"""');
          }
          return el;
        })
        .join('","') + '"';
    }).join('\r\n');
  }

  formatTime(timeMS) {
    const timeS = Math.round(timeMS / 1000);
    const hours = this.getHours(timeS);
    const minutes = this.getMinutes(timeS);
    return `${hours}:${minutes}`;
  }

  getHours(timeS) {
    return this.getLeadZero(Math.floor(timeS / 3600));
  }

  getMinutes(timeS) {
    return this.getLeadZero(Math.floor((timeS % 3600) / 60));
  }

  getLeadZero(val: number) {
    return ('0' + val).slice(-2);
  }
}
