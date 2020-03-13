import { Controller, Get, HttpService, NotFoundException, Param } from '@nestjs/common';
import { CrudController } from '../cms/content/controllers/crud-controller';
import { CrudEntity } from '../cms/content/decorators/crud-controller.decorator';
import { OrderEntity } from '../orders/entities/order.entity';
import { Repository } from 'typeorm';
import { RolesAndPermissionsService } from '../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper } from '../cms/roles-and-permissions/misc/content-permission-helper';
import { PromoCodeEntity } from './entities/promo-code.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { from, timer } from 'rxjs';
import { delay, map } from 'rxjs/operators';

@Controller('promo-codes')
@CrudEntity(OrderEntity)
export class PromoCodesController extends CrudController {

  constructor(
    @InjectRepository(PromoCodeEntity) protected readonly repository: Repository<PromoCodeEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('code/:code')
  async getByCode(
    @Param('code') code: string,
  ) {
    return from(
      this.repository.findOne({ code }),
    ).pipe(
      delay(2000),
      map(promoCode => {
        if (promoCode) {
          return promoCode;
        } else {
          throw new NotFoundException();
        }
      }),
    ).toPromise();
  }
}
