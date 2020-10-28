import {
  BadRequestException,
  Body,
  Controller, Get,
  InternalServerErrorException,
  NotFoundException, Param,
  Post,
  Put, Query, UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { MerchantEntity } from '../entities/merchant.entity';
import { Brackets, Repository, In } from 'typeorm';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { InjectRepository } from '@nestjs/typeorm';
import { MerchantDepartmentEntity } from '../entities/merchant-department.entity';
import { MerchantsService } from '../services/merchants.service';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { UsersService } from '../../cms/users/services/users.service';
import { MerchantsPermissionKeys, MerchantsRolesName } from '../services/merchants-config.service';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { ContentEntityParam } from '../../cms/content/decorators/content-entity-param.decorator';
import * as fs from 'fs';
import { ContentViewUnpublishedPermissionsGuard } from '../../cms/content/guards/content-view-unpublished-permission.guard';
import { MenuCategoryEntity } from '../entities/menu-category.entity';
import { EmailTemplates } from '../../email-distributor/data/email-templates';
import { SanitizeUser, SanitizeUsers } from '../../cms/users/decorators/sanitize-user.decorator';
import { PaymentCardEntity } from '../../payments/entities/payment-card.entity';
import { SmsActivationService } from '../../sms-activation/services/sms-activation.service';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { SettingsService } from '../../settings/services/settings.service';
import { EmailSenderService } from '../../email-distributor/services/email-sender.service';
import * as time from 'time';
import { OrderEntity } from '../../orders/entities/order.entity';
import { MerchantsSearchService } from '../services/merchants-search.service';
import { MenuItemEntity } from '../entities/menu-item.entity';
import { ZipcodesService } from '../../geocoder/services/zipcodes.service';

@Controller('merchants')
@CrudEntity(MerchantEntity)
export class MerchantsController extends CrudController {

  constructor(
    @InjectRepository(MerchantEntity)
    protected readonly repository: Repository<MerchantEntity>,
    @InjectRepository(MerchantDepartmentEntity)
    protected readonly repositoryDepartments: Repository<MerchantDepartmentEntity>,
    @InjectRepository(MenuCategoryEntity)
    protected readonly repositoryCategories: Repository<MenuCategoryEntity>,
    @InjectRepository(MenuItemEntity)
    protected readonly repositoryMenuItems: Repository<MenuItemEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    private merchantsService: MerchantsService,
    private merchantsSearchService: MerchantsSearchService,
    private usersService: UsersService,
    private smsActivationService: SmsActivationService,
    private settingsService: SettingsService,
    private readonly emailSenderService: EmailSenderService,
    private readonly zipcodesService: ZipcodesService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('registerSearch')
  registerSearch() {
    return this.merchantsService
      .migrateMerchants();
  }

  @Get('resetSearch')
  resetSearch() {
    return this.merchantsService
      .clearMerchantsSearch();
  }

  @Get('doSearch')
  async doSearch(
    @User() user: UserEntity,
    @Query('query') query: string,
  ) {
    const mainMerchantHits: any[] = await this.merchantsService
      .searchMerchants(query);
    const mainMerchantIds: number[] = mainMerchantHits
      .map(result => result._source.id);
    let extraMerchantsIds: number[] = [];
    const hits: any[] = await this.merchantsService.searchMenuItems(query);
    if (hits.length === 0) {
      return [];
    }
    const itemsIds: number[] = hits.map(hit => hit._source.id);
    const itemsQueryBuilder = await this.repositoryMenuItems
      .createQueryBuilder('entity')
      .select('DISTINCT entity.merchantId')
      .where('entity.id IN (:...itemsIds)', { itemsIds });
    const itemsRawData = await itemsQueryBuilder
      .getRawMany();
    extraMerchantsIds = itemsRawData
      .map(rawData => rawData.merchantId)
      .filter(merchantId => mainMerchantIds.indexOf(merchantId) === -1);
    const resultMerchantsIds = [ ...mainMerchantIds, ...extraMerchantsIds];
    const builder = await this.getQueryBuilder(user, {});
    builder.select(['entity', 'departments']);
    builder.andWhere('entity.id IN (:...ids)', { ids:  resultMerchantsIds});
    const merchants = await builder.getMany();
    const merchantsAssoc = {};
    merchants.forEach(merchant => {
      merchantsAssoc[merchant.id] = merchant;
    });
    const merchantsResultList = [];
    resultMerchantsIds.forEach(merchantId => {
      const merchant = merchantsAssoc[merchantId];
      merchantsResultList.push(merchant);
    });
    const date = new time.Date();
    return merchantsResultList.map(
      merchant => {
        date.setTimezone(merchant.departments[0].timezone);
        merchant.departments[0].timezoneOffset = -date.getTimezoneOffset();
        return merchant;
      },
    );
  }

  @Get('test-recipient')
  async testRecipient(
    @Query('email') email: string,
  ) {
    return this.emailSenderService.addToCustomersList(email);
  }

  @Get('')
  @SanitizeUsers('user')
  async loadContentEntities(@User() user: UserEntity, @Query() query) {
    const builder = await this.getQueryBuilder(user, query);
    const date = new time.Date();
    const merchants = await builder.getMany();
    return (merchants as MerchantEntity[]).map(
      merchant => {
        date.setTimezone(merchant.departments[0].timezone);
        merchant.departments[0].timezoneOffset = -date.getTimezoneOffset();
        return merchant;
      },
    );
    // return merchants;
  }

  @Get('count')
  async countOrders(@User() user: UserEntity, @Query() query: any) {
    query.zipcode = null;
    delete query.zipcode;
    const builder = await this.getQueryBuilder(user, query);
    return builder.getCount();
  }

  @Get('me')
  @SanitizeUser('user')
  async loadMyData(@User() user: UserEntity) {
    const secureWhere = await this.getWhereRestrictionsByPermissions(user);
    if (secureWhere === false) {
      throw new UnauthorizedException();
    }
    const merchant = await this.repository.findOne({
      where: {
        userId: user.id,
      },
      relations: [ 'departments', 'user', 'categories' ],
    });
    if (!merchant) {
      throw new NotFoundException();
    }
    merchant.user = user;
    return merchant;
  }

  @Get(':id')
  @UseGuards(ContentViewUnpublishedPermissionsGuard)
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentViewOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentViewAll];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  @SanitizeUser('user')
  async loadMerchant(@ContentEntityParam() entity: MerchantEntity, @User() user: UserEntity) {
    const date = new time.Date();
    date.setTimezone(entity.departments[0].timezone);
    entity.departments[0].timezoneOffset = -date.getTimezoneOffset();
    return entity;
  }

  @Post('/sign-up')
  async createInactiveMerchant(@Body() merchant: MerchantEntity, @User() user: UserEntity) {
    const isNewUser = !merchant.user.id;
    if (!isNewUser) {
      throw new UnprocessableEntityException('Cannot assign existed user');
    }
    if (!merchant.departments.length || merchant.departments[0].id) {
      throw new UnprocessableEntityException('Cannot assign existed department');
    }
    const existedMerchant = await this.repository.findOne({
      email: merchant.email,
    });
    if (existedMerchant) {
      throw new UnprocessableEntityException('Merchant already exists');
    }
    const existedUser = await this.usersService
      .getSingle({
        username: merchant.user.username,
        isActive: false,
      });
    if (existedUser) {
      await this.usersService
        .removeUser(existedUser.id);
    }
    try {
      merchant.user = await this.usersService
        .addRoleIfAbsent(merchant.user, MerchantsRolesName.Merchant);
      merchant.user.isActive = true;
      // merchant.user.isActive = false;
      merchant.user = await this.usersService
        .createUser(merchant.user);
      // merchant.authorId = merchant.user.id;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        // TODO i18n
        throw new UnprocessableEntityException('Email already exists');
      } else {
        throw new InternalServerErrorException(e.toString());
      }
    }
    if (user.isAuthorized()) {
      merchant.authorId = user.id;
    }
    // await this.generateSmsCode(merchant.user.id, merchant.phone);
    merchant.enableBooking = true;
    merchant.enableMenu = false;
    // merchant.isPublished = false;
    merchant.isPublished = true;
    merchant.userId = merchant.user.id;
    const departments = merchant.departments;
    merchant.departments = null;
    delete merchant.departments;
    try {
      merchant = await this.repository.save(merchant);
    } catch (e) {
      await this.usersService
        .removeUser(merchant.user.id);
      throw new InternalServerErrorException(e.toString());
    }
    try {
      for (const depData of departments) {
        if (depData.zipcode) {
          const zipcode = await this.zipcodesService
            .getZipcodeByZipcode(depData.zipcode);
          if (zipcode) {
            depData.zipcodeEntityId = zipcode.id;
          } else {
            merchant.enableBooking = false;
            merchant = await this.repository.save(merchant);
          }
        }
        depData.merchantId = merchant.id;
        await this.repositoryDepartments.save(depData);
      }
    } catch (e) {
      throw new UnprocessableEntityException(e.toString());
    }
    this.sendEmail(merchant.email);
    return { success: true };
  }

  @Post('')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  @SanitizeUser('user')
  async createActiveMerchant(@Body() merchant: MerchantEntity, @User() user: UserEntity) {
    const isNewUser = !merchant.user.id;
    if (!isNewUser) {
      throw new UnprocessableEntityException('Cannot assign existed user');
    }
    if (!merchant.departments.length || merchant.departments[0].id) {
      throw new UnprocessableEntityException('Cannot assign existed department');
    }
    const existedMerchant = await this.repository.findOne({
      email: merchant.email,
    });
    if (existedMerchant) {
      throw new UnprocessableEntityException('Merchant already exists');
    }
    try {
      merchant.user.username = merchant.email;
      merchant.user = await this.usersService
        .addRoleIfAbsent(merchant.user, MerchantsRolesName.Merchant);
      merchant.user.isActive = true;
      merchant.user = await this.usersService
        .createUser(merchant.user);
      merchant.authorId = merchant.user.id;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        // TODO i18n
        throw new UnprocessableEntityException('Email already exists');
      } else {
        throw new InternalServerErrorException(e.toString());
      }
    }
    merchant.enableBooking = merchant.enableBooking;
    if (merchant.enableMenu) {
      const permission = await this.rolesAndPermissions
        .getPermissionByKey(MerchantsPermissionKeys.ChangeEnableBooking);
      merchant.enableMenu = await this.rolesAndPermissions
        .checkPermissionByRoles(
          permission,
          user.roles,
        );
    }
    merchant.isPublished = true;
    merchant.userId = merchant.user.id;
    const departments = merchant.departments;
    merchant.departments = null;
    delete merchant.departments;
    const logo = merchant.logo;
    merchant.logo = null;
    try {
      merchant = await this.repository.save(merchant);
      if (logo) {
        merchant.logo = logo;
        merchant.logo = this.createImage(merchant);
        merchant = await this.repository.save(merchant);
      }
    } catch (e) {
      throw new InternalServerErrorException(e.toString());
    }
    try {
      for (const depData of departments) {
        if (depData.zipcode) {
          const zipcode = await this.zipcodesService
            .getZipcodeByZipcode(depData.zipcode);
          if (zipcode) {
            depData.zipcodeEntityId = zipcode.id;
          } else {
            merchant.enableBooking = false;
            merchant.enableMenu = false;
            merchant = await this.repository.save(merchant);
          }
        }
        depData.merchantId = merchant.id;
        await this.repositoryDepartments.save(depData);
      }
    } catch (e) {
      throw new UnprocessableEntityException(e.toString());
    }
    this.sendEmail(merchant.email);
    merchant = await this.repository.findOne(merchant.id);
    if (merchant.enableMenu && merchant.isPublished) {
      await this.merchantsSearchService
        .registerMerchants(merchant);
    }
    return merchant;
  }

  @Post('confirm-sms')
  @SanitizeUser('user', false)
  async confirmSms(@Body() data: { email: string, code: string }) {
    const merchant = await this.repository.findOne({
      email: data.email,
    });
    if (merchant && !merchant.user.isActive) {
      const isCodeCorrect = await this.smsActivationService
        .checkSmsActivation(merchant.userId, data.code);
      if (isCodeCorrect) {
        const user = await this.usersService.loginUserById(merchant.userId);
        user.isActive = true;
        await this.usersService.updateUser(user);
        merchant.isPublished = true;
        await this.repository.save(merchant);
        this.sendEmail(merchant.email);
        return user;
      } else {
        throw new BadRequestException('SMS Code is wrong. Please, try to resend sms code');
      }
    } else {
      throw new BadRequestException('This user is already active.');
    }
  }

  @Post('resend-sms')
  async resendSms(@Body() data: { email: string }) {
    const merchant = await this.repository.findOne({
      email: data.email,
    });
    if (merchant && !merchant.user.isActive) {
      await this.generateSmsCode(merchant.userId, merchant.phone);
      return { success: true };
    } else {
      throw new BadRequestException('This user is already active.');
    }
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
    @ContentEntityParam() currentEntity: MerchantEntity,
    @Body() newEntity: MerchantEntity,
  ) {
    if (newEntity.enableMenu) {
      const permission = await this.rolesAndPermissions
        .getPermissionByKey(MerchantsPermissionKeys.ChangeEnableBooking);
      newEntity.enableMenu = await this.rolesAndPermissions
        .checkPermissionByRoles(
          permission,
          user.roles,
        );
    }
    if (newEntity.email) {
      const userId = newEntity.user ? newEntity.user.id : newEntity.userId;
      if (!userId) {
        throw new UnprocessableEntityException('User is not defined');
      }
      let newUser = await this.usersService.findById(newEntity.userId);
      if (newEntity.email !== newUser.username) {
        newUser.username = newEntity.email;
        try {
          newUser = await this.usersService.updateUser(newUser);
        } catch (e) {
          throw new UnprocessableEntityException('Email already exists');
        }
      }
      newEntity.user = newUser;
    }
    if (newEntity.logo && !newEntity.logo.startsWith('http')) {
      newEntity.logo = this.createImage(newEntity);
    } else if (newEntity.logo === null) {
      if (currentEntity.logo) {
        const imgPath = currentEntity.logo.replace('/', '');
        fs.unlink(imgPath, () => null);
      }
    }
    if (newEntity.departments && newEntity.departments.length) {
      const department = new MerchantDepartmentEntity(newEntity.departments[0]);
      if (department.zipcode) {
        const zipcode = await this.zipcodesService
          .getZipcodeByZipcode(department.zipcode);
        if (zipcode) {
          department.zipcodeEntityId = zipcode.id;
        } else {
          newEntity.enableBooking = false;
          newEntity.enableMenu = false;
        }
      }
      await this.repositoryDepartments.save(department);
    }
    const result = await super.updateContentEntity(user, currentEntity, newEntity);
    this.merchantsService.migrateMenuItems({
      merchantId: currentEntity.id,
    });
    this.merchantsSearchService
      .registerMerchants(result as MerchantEntity);
    return result;
  }

  @Post('contact-email')
  async contactEmail(@Body() { email, message, name }: { email: string, message: string, name: string }) {
    await this.emailSenderService
      .sendEmail(
        'merchant@snapgrabdelivery.com',
        `This is an email from: ${name} (${email})`,
        message);
    return { success: true };
  }

  private async generateSmsCode(userId, phone) {
    const smsActivation = await this.smsActivationService
      .createSmsActivation(userId);
    await this.smsActivationService
      .sendVerificationSms({
        phone,
        code: smsActivation.code,
        text: this.settingsService.getValue(SettingsVariablesKeys.SMSSignUpMerchantText),
      });
  }

  private createImage(entity: MerchantEntity) {
    const jpegStartStr = 'data:image/jpeg;base64,';
    const pngStartStr = 'data:image/png;base64,';
    const isJpeg = entity.logo.startsWith(jpegStartStr);
    const isPng = entity.logo.startsWith(pngStartStr);
    if (!isJpeg && !isPng) {
      throw new UnprocessableEntityException('Image format is wrong');
    }
    const ext = isJpeg ? '.jpg' : '.png';
    const { path, fileName } = this.getFileName(entity.id, ext);
    const data = isJpeg ?
      entity.logo.replace(jpegStartStr, '') :
      entity.logo.replace(pngStartStr, '');
    try {
      fs.readdirSync(path);
    } catch (e) {
      fs.mkdirSync(path, { recursive: true });
    }
    const filePath = `${path}/${fileName}`;
    fs.writeFileSync(filePath, data, 'base64');
    return `/${filePath}`;
  }

  private getFileName(id: number | string, ext: string) {
    const path = 'uploads/merchants/logo';
    const fileName = 'merchant-' + id + ext;
    return { path, fileName };
  }

  private async sendEmail(email: string) {
    if (email) {
      await this.emailSenderService
        .sendEmailToMerchant(
          email,
          EmailTemplates.MerchantRegistration,
          {
            '[Server_Name]': 'SnapGrab',
          },
        );
      return true;
    } else {
      throw new BadRequestException();
    }
  }

  protected async getQueryBuilder(user, query) {
    const hasCreditCard = !!query.hasCreditCard;
    const zipcode = query.zipcode;
    let search = query.search;
    delete query.hasCreditCard;
    delete query.zipcode;
    delete query.search;

    query.limit = 100;

    const builder = await super.getQueryBuilder(user, query);
    builder.leftJoinAndSelect('entity.user', 'user');
    builder.leftJoinAndSelect('entity.departments', 'departments');
    if (hasCreditCard) {
      builder.innerJoin(PaymentCardEntity, 'card', 'card.authorId = entity.userId');
    }
    if (zipcode) {
      builder.innerJoin(
        'departments.zipcodeEntity',
        'zipcodeEntity',
        'departments.zipcodeEntityId = zipcodeEntity.id',
      );
      builder.innerJoin(
        'zipcodeEntity.zipcodesDistanceAssoc',
        'zipcodesDistanceAssoc',
        'zipcodeEntity.id = zipcodesDistanceAssoc.source',
      );
      builder.innerJoin(
        'zipcodesDistanceAssoc.destinationZipcode',
        'destinationZipcode',
        'zipcodesDistanceAssoc.destination = destinationZipcode.id',
      );
      builder.andWhere('destinationZipcode.zipcode = :zipcode', { zipcode });
      builder.addSelect('zipcodesDistanceAssoc.distance');
      builder.orderBy('zipcodesDistanceAssoc.distance', 'ASC');

      // builder.leftJoin('departments.zipcodeMapDistance', 'zipcodeMapDistance');
      // builder.andWhere('zipcodeMapDistance.destination = :zipcode', { zipcode });
      // builder.addSelect('zipcodeMapDistance.distance');
      // builder.orderBy('zipcodeMapDistance.distance', 'ASC');
    }
    const extraWhere = await this.getWhereRestrictionsByPermissions(user);
    if (extraWhere && extraWhere.isPublished) {
      builder.andWhere('entity.enableMenu = :enableMenu', { enableMenu: true });
    }
    if (search) {
      search = `%${search}%`;
      builder
        .andWhere(new Brackets(sqb => {
          sqb
            .where('entity.name LIKE :search', { search })
            .orWhere('entity.email LIKE :search', { search })
            .orWhere('entity.reference LIKE :search', { search })
            .orWhere('entity.id LIKE :search', { search });
        }));
    }
    return builder;
  }
}
