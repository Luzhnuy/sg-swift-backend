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
import { Brackets, Repository } from 'typeorm';
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
import { SendGridService } from '@anchan828/nest-sendgrid';
import * as SendGridClient from '@sendgrid/client';

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
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    private merchantsService: MerchantsService,
    private usersService: UsersService,
    private sendGrid: SendGridService,
    private smsActivationService: SmsActivationService,
    private settingsService: SettingsService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Get('test-recipient')
  async testRecipient(
    @Query('email') email: string,
  ) {
    return this.createSendGridRecipient(email);
  }

  @Get('')
  @SanitizeUsers('user')
  async loadContentEntities(@User() user: UserEntity, @Query() query) {
    const builder = await this.getQueryBuilder(user, query);
    return builder.getMany();
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
      merchant.user.isActive = false;
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
    await this.generateSmsCode(merchant.user.id, merchant.phone);
    merchant.enableBooking = true;
    merchant.enableMenu = false;
    merchant.isPublished = false;
    merchant.userId = merchant.user.id;
    const departments = merchant.departments;
    merchant.departments = null;
    delete merchant.departments;
    try {
      merchant = await this.repository.save(merchant);
    } catch (e) {
      throw new InternalServerErrorException(e.toString());
    }
    try {
      for (const depData of departments) {
        depData.merchantId = merchant.id;
        await this.repositoryDepartments.save(depData);
      }
    } catch (e) {
      throw new UnprocessableEntityException(e.toString());
    }
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
        depData.merchantId = merchant.id;
        await this.repositoryDepartments.save(depData);
      }
    } catch (e) {
      throw new UnprocessableEntityException(e.toString());
    }
    this.sendEmail(merchant.email);
    merchant = await this.repository.findOne(merchant.id);
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
    if (newEntity.logo) {
      newEntity.logo = this.createImage(newEntity);
    } else if (newEntity.logo === null) {
      if (currentEntity.logo) {
        const imgPath = currentEntity.logo.replace('/', '');
        fs.unlink(imgPath, () => null);
      }
    }
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
    const result = await super.updateContentEntity(user, currentEntity, newEntity);
    this.merchantsService.migrateMenuItems({
      merchantId: currentEntity.id,
    });
    return result;
  }

  @Post('contact-email')
  contactEmail(@Body() { email, message, name }: { email: string, message: string, name: string }) {
    this.sendGrid.send({
      to: 'merchant@snapgrabdelivery.com',
      from: {
        email: 'support@SnapGrabDelivery.com',
        name: 'SnapGrab',
      },
      subject: `This is an email from: ${name} (${email})`,
      text: message,
    });
    return { success: true };
  }

  private async generateSmsCode(userId, phone) {
    const smsActivation = await this.smsActivationService
      .createSmsActivation(userId);
    await this.smsActivationService.sendVerificationSms({
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
    const data = isJpeg ? entity.logo.replace(jpegStartStr, '') : entity.logo.replace(pngStartStr, '');
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
      await this.sendGrid.send({
        to: email,
        from: {
          email: 'support@SnapGrabDelivery.com',
          name: 'SnapGrab',
        },
        templateId: EmailTemplates.MerchantRegistration,
        dynamicTemplateData: {
          '[Server_Name]': 'SnapGrab',
        },
      });
      await this.addMerchantEmailToMerchantRecipientsList(email);
    } else {
      throw new BadRequestException();
    }
  }

  private async addMerchantEmailToMerchantRecipientsList(email: string) {
    const customersList = 7238438;
    const nonCustomerList = 7238428;
    const merchantsList = 8443043;
    let recipient = await this.getSendGridRecipient(email);
    if (!recipient) {
      recipient = await this.createSendGridRecipient(email);
      if (!recipient) {
        console.log('CANNOT CREATE RECIPIENT :: ', email);
      }
    }
    const request: any = {};
    request.method = 'POST';
    request.url = `/v3/contactdb/lists/${merchantsList}/recipients/${recipient.id}`;
    await SendGridClient.request(request);
    const queryParams = {
      list_id: merchantsList,
      recipient_id: recipient.id,
    };
    request.qs = queryParams;
    request.method = 'DELETE';
    request.url = `/v3/contactdb/lists/${nonCustomerList}/recipients/${recipient.id}`;
    await SendGridClient.request(request);
  }

  private async createSendGridRecipient(email) {
    const request: any = {};
    request.body = [ { email } ];
    request.method = 'POST';
    request.url = '/v3/contactdb/recipients';
    SendGridClient.setApiKey(this.settingsService.getValue(SettingsVariablesKeys.SendGridKey));
    const res = await SendGridClient.request(request);
    if (res[1].new_count) {
      return {
        id: res[1].persisted_recipients[0],
        email,
      };
    }
    return null;
  }

  private async getSendGridRecipient(email) {
    const request: any = {};
    const queryParams: any = {
      email,
    };
    request.qs = queryParams;
    request.method = 'GET';
    request.url = '/v3/contactdb/recipients/search';
    SendGridClient.setApiKey(this.settingsService.getValue(SettingsVariablesKeys.SendGridKey));
    const res = await SendGridClient.request(request);
    if (!res[1]) {
      console.log('RECIPIENTS ERROR :: ', email, res);
      return null;
    }
    const recipients: Array<{ id: string, email: string; }> = res[1].recipients;
    return recipients[0];
  }

  protected async getQueryBuilder(user, query) {
    const hasCreditCard = !!query.hasCreditCard;
    const zipcode = query.zipcode;
    let search = query.search;
    delete query.hasCreditCard;
    delete query.zipcode;
    delete query.search;
    const builder = await super.getQueryBuilder(user, query);
    builder.leftJoinAndSelect('entity.user', 'user');
    builder.leftJoinAndSelect('entity.departments', 'departments');
    if (hasCreditCard) {
      builder.innerJoin(PaymentCardEntity, 'card', 'card.authorId = entity.userId');
    }
    // builder.leftJoinAndSelect('departments.test', 'test');
    builder.leftJoinAndSelect('departments.zipcodeMapDistance', 'zipcodeMapDistance');
    if (zipcode) {
      builder.andWhere('zipcodeMapDistance.destination = :zipcode', { zipcode });
      builder.orderBy('zipcodeMapDistance.distance', 'ASC');
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
            .orWhere('entity.reference LIKE :search', { search })
            .orWhere('entity.id LIKE :search', { search });
        }));
    }
    return builder;
  }
}
