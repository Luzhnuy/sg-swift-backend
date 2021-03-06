import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get, HttpService, InternalServerErrorException, NotFoundException,
  Param,
  Post,
  Put,
  Query, Req, Res,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ContentViewUnpublishedPermissionsGuard } from '../../cms/content/guards/content-view-unpublished-permission.guard';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { ContentEntityParam } from '../../cms/content/decorators/content-entity-param.decorator';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { SanitizeUser, SanitizeUsers } from '../../cms/users/decorators/sanitize-user.decorator';
import { CustomerEntity } from '../entities/customer.entity';
import { Brackets, Column, JoinColumn, OneToOne, Repository } from 'typeorm';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { UsersService } from '../../cms/users/services/users.service';
import { SmsActivationService } from '../../sms-activation/services/sms-activation.service';
import { SettingsService } from '../../settings/services/settings.service';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentCardEntity } from '../../payments/entities/payment-card.entity';
import { CustomerMetadataEntity } from '../entities/customer-metadata.entity';
import { CustomerDeviceInfoEntity } from '../entities/customer-device-info.entity';
import { EmailTemplates } from '../../email-distributor/data/email-templates';
import { CustomersRolesName } from '../providers/customers-config';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { CustomersService } from '../services/customers.service';
import { Subject } from 'rxjs';
import { EmailSenderService } from '../../email-distributor/services/email-sender.service';
import * as fs from 'fs';
import { OrderEntity } from '../../orders/entities/order.entity';
import { OrderMetadataEntity } from '../../orders/entities/order-metadata.entity';
import { JwtService } from '@nestjs/jwt';

import jwtDecode from 'jwt-decode';
import { Response, Request } from 'express';
import { Environment } from '../../environment';
import { AppleTempUserEntity } from '../entities/apple-temp-user.entity';

@Controller('customers')
@CrudEntity(CustomerEntity)
export class CustomersController extends CrudController {

  constructor(
    @InjectRepository(CustomerEntity)
    protected readonly repository: Repository<CustomerEntity>,
    @InjectRepository(CustomerMetadataEntity)
    protected readonly repositoryMetadata: Repository<CustomerMetadataEntity>,
    @InjectRepository(CustomerDeviceInfoEntity)
    protected readonly repositoryDeviceInfo: Repository<CustomerDeviceInfoEntity>,
    @InjectRepository(AppleTempUserEntity)
    protected readonly repositoryAppleTempUser: Repository<AppleTempUserEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    private usersService: UsersService,
    private emailSenderService: EmailSenderService,
    private smsActivationService: SmsActivationService,
    private settingsService: SettingsService,
    private customersService: CustomersService,
    private httpService: HttpService,
    private jwtService: JwtService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Post('login-from-old-token')
  @SanitizeUser(null, false)
  async loginFromOldToken(@Body() { token }) {
    const subj = new Subject();
    if (token) {
      this.httpService.get<Array<{ users: { username: string } }>>(
        this.settingsService.getValue(SettingsVariablesKeys.PhpApiUrl) +
        '/users/getusernamebytoken/' + token,
      ).subscribe(async (result) => {
        if (result.data.length) {
          const username = result.data[0].users.username;
          const user = await this.usersService.getSingle( { username });
          if (user) {
            const loggedUser = await this.usersService.loginUserById(user.id);
            subj.next(loggedUser);
            subj.complete();
          } else {
            subj.error(new UnprocessableEntityException('Unable to login from previous version. Please, login again'));
            subj.complete();
          }
        }
      });
    } else {
      throw new BadRequestException();
    }
    return subj.toPromise();
  }

  @Get('')
  @SanitizeUsers('user')
  async loadContentEntities(@User() user: UserEntity, @Query() query) {
    const builder = await this.getQueryBuilder(user, query);
    return builder.getMany();
  }

  @Get('count')
  async countOrders(@User() user: UserEntity, @Query() query: any) {
    const builder = await this.getQueryBuilder(user, query);
    return builder.getCount();
  }

  @Get('test-apple-sign-in')
  testAppleSignIn(
    @Res() response: Response,
  ) {
    const cookieOptions: any = {
      httpOnly: false,
      path: '/',
      domain: Environment.cookie.domain,
      secure: Environment.cookie.secure,
    };
    // response.cookie(Environment.cookie.name,
    //   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIzNTk1LCJ0b2tlbiI6' +
    //   'ImJkMTAxM2VjMjkwY2Q0YzRjOGEwNGQ3YzVmMmM3MDI4NzNmZGMyMzc5ODg0YmQ3YjBjZ' +
    //   'DViNDc0ZDE2ZWZhNjUiLCJpYXQiOjE2MDgxNzYxNjB9.8ZEAVO8rxJoE1cEIKK8Mp_qfxzCsgHq_L1qzUJn-CbE',
    //   cookieOptions);
    response.cookie('appleUser',
      JSON.stringify({"login":"ijw2bc2ise_privaterelay.appleid.com@appleid.com","email":"ijw2bc2ise@privaterelay.appleid.com","firstName":"","lastName":"","password":"001744.7964c190e0e64b1ba97875f83bfe9411.1548","authorId":null,"moderatorId":null,"id":4,"isPublished":true,"createdAt":"2020-12-17T07:38:45.000Z","updatedAt":"2020-12-17T07:38:45.000Z"}),
      cookieOptions);
    response.redirect('http://localhost:8081/sign-up?destination=Checkout');
  }

  @Get('me')
  @SanitizeUser('user')
  async loadMyData(@User() user: UserEntity) {
    if (user.isAuthorized()) {
      const customer = await this.repository.findOne({
        where: {
          userId: user.id,
        },
        relations: [ 'metadata', 'user'],
      });
      if (customer && customer.metadata.appVersion !== '3.0') {
        customer.metadata.appVersion = '3.0';
        await this.repositoryMetadata.save(customer.metadata);
      }
      if (customer) {
        return customer;
      } else {
        throw new NotFoundException('Customer not found');
      }
    } else {
      throw new UnauthorizedException();
    }
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
  async loadCustomer(@ContentEntityParam() entity: ContentEntity) {
    return entity;
  }

  @Get(':id/debt')
  @UseGuards(ContentEntityNotFoundGuard)
  async loadCustomerDebt(@ContentEntityParam() entity: ContentEntity) {
    const builder = this.repository
      .createQueryBuilder('entity');
    builder.select('SUM(metadata.debtAmount) as debtAmount');
    builder.where('entity.id = :id', { id: entity.id });
    builder.innerJoin(OrderEntity, 'order', 'order.customerId = entity.id');
    builder.innerJoin(OrderMetadataEntity, 'metadata', 'order.metadataId = metadata.id');
    const res = await builder.getRawOne();
    if (res.debtAmount && res.debtAmount !== null && res.debtAmount !== '0' && res.debtAmount === 0) {
      return parseInt(res.debtAmount, 10);
    } else {
      return 0;
    }
  }

  @Post('sign-in-with-apple')
  async signInWithApple(
    @Body() body: {
      code: string;
      state: string;
      id_token: string;
      user?: {
        name: {
          firstName: string;
          lastName: string;
        };
        email: string;
      };
    },
    @Res() response: Response,
  ) {
    const cookieOptions: any = {
      httpOnly: false,
      path: '/',
      domain: Environment.cookie.domain,
      secure: Environment.cookie.secure,
    };
    const redirectUrl = Buffer.from(body.state, 'base64').toString();
    const tokenDecoded: {
      iss: string;
      aud: string;
      exp: number;
      iat: number;
      sub: string;
      c_hash: string;
      email: string;
      email_verified: boolean;
      auth_time: number;
      nonce_supported: boolean;
    } = jwtDecode(body.id_token) as any;
    let email = '';
    let firstName = '';
    let lastName = '';
    const password = tokenDecoded.sub;
    let login = tokenDecoded.email;
    if (body.user) {
      email = body.user.email;
      if (body.user.name) {
        firstName = body.user.name.firstName;
        lastName = body.user.name.lastName;
      }
    }
    if (!login.endsWith('@privaterelay.appleid.com')) {
      email = login;
      login = login
          .replace('@', '_')
        + '@privaterelay.appleid.com';
    }
    const existedActiveUser = await this.usersService
      .getSingle({
        username: login,
        isActive: true,
      });
    if (existedActiveUser) {
      // const authUser = await this.usersService.loginUserById(existedActiveUser.id);
      const authUser = await this.usersService.loginUser(login, password);
      response.cookie(Environment.cookie.name, authUser.authToken, cookieOptions);
    } else {
      const existedInactiveUser = await this.usersService
        .getSingle({
          username: login,
          isActive: false,
        });
      if (existedInactiveUser) {
        const customer = await this.repository.findOne({
          userId: existedInactiveUser.id,
        });
        if (customer) {
          email = customer.email;
          firstName = customer.firstName;
          lastName = customer.lastName;
          await this.repository.remove(customer);
        }
        await this.usersService
          .removeUser(existedInactiveUser.id);
      }
      let appleUser = await this.repositoryAppleTempUser
        .findOne({ login });
      if (!appleUser) {
        appleUser = await this.repositoryAppleTempUser
          .save(new AppleTempUserEntity({
            login,
            email,
            firstName,
            lastName,
            password,
          }));
      }
      const appleUserStr = JSON.stringify(appleUser);
      response.cookie('appleUser', appleUserStr, cookieOptions);
    }
    response.redirect(redirectUrl);
    return body;
  }

  @Post('/sign-up')
  async createInactiveCustomer(@Body() customer: CustomerEntity, @User() user: UserEntity) {
    const isNewUser = !customer.user.id;
    if (!isNewUser) {
      throw new UnprocessableEntityException('Cannot assign existed user');
    }
    let existedCustomer: CustomerEntity;
    if (customer.email !== null) {
      existedCustomer = await this.repository.findOne({
        email: customer.email,
      });
      if (existedCustomer && existedCustomer.user && existedCustomer.user.username !== customer.user.username) {
        existedCustomer = null;
      }
    }
    if (existedCustomer) {
      if (existedCustomer.isPublished) {
        throw new UnprocessableEntityException('User already exists');
      } else {
        await this.usersService
          .removeUser(existedCustomer.userId);
        await this.repository.delete(existedCustomer);
      }
    }
    const existedUser = await this.usersService
      .getSingle({
        username: customer.user.username,
        isActive: false,
      });
    if (existedUser) {
      await this.usersService
        .removeUser(existedUser.id);
    }
    try {
      customer.user = await this.usersService
        .addRoleIfAbsent(customer.user, CustomersRolesName.Customer);
      customer.user.isActive = false;
      customer.user = await this.usersService
        .createUser(customer.user);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        // TODO i19n
        throw new UnprocessableEntityException('Email already exists');
      } else {
        throw new InternalServerErrorException(e.toString());
      }
    }
    if (user.isAuthorized()) {
      customer.authorId = user.id;
    }
    await this.generateSmsCode(customer.user.id, customer.phone);
    customer.isPublished = false;
    customer.userId = customer.user.id;
    const metadata = customer.metadata;
    customer.metadata = null;
    delete customer.metadata;
    const deviceInfo = customer.deviceInfo;
    customer.deviceInfo = null;
    delete customer.deviceInfo;
    if (metadata.refUserId) {
      metadata.credit = 10;
    } else {
      metadata.credit = 5;
    }
    try {
      customer = await this.repository.save(customer);
      metadata.customerId = customer.id;
      deviceInfo.customerId = customer.id;
      await this.repositoryMetadata.save(metadata);
      await this.repositoryDeviceInfo.save(deviceInfo);
    } catch (e) {
      throw new InternalServerErrorException(e.toString());
    }
    const appleUser = await this.repositoryAppleTempUser.findOne({
      login: customer.user.username,
    });
    if (appleUser) {
      await this.repositoryAppleTempUser
        .remove(appleUser);
    }
    return { success: true };
  }

  @Post('confirm-sms')
  @SanitizeUser('user', false)
  async confirmSms(@Body() data: { email: string, code: string }) {
    // const customer = await this.repository.findOne({
    //   email: data.email,
    // });
    let user = await this.usersService
      .getSingle({
        username: data.email,
      });
    const customer = await this.repository.findOne({
      userId: user.id,
    });
    if (customer && !customer.user.isActive) {
      const isCodeCorrect = await this.smsActivationService
        .checkSmsActivation(customer.userId, data.code);
      if (isCodeCorrect) {
        user = await this.usersService.loginUserById(customer.userId);
        user.isActive = true;
        await this.usersService.updateUser(user);
        customer.isPublished = true;
        customer.user = null;
        delete customer.user;
        await this.repository.save(customer);
        this.sendEmail(customer.email, customer.firstName);
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
    const customer = await this.repository.findOne({
      email: data.email,
    });
    if (customer && !customer.user.isActive) {
      await this.generateSmsCode(customer.userId, customer.phone);
      return { success: true };
    } else {
      throw new BadRequestException('This user is already active.');
    }
  }

  @Post('')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  @SanitizeUser('user')
  async createContentEntity(@Body() entity: CustomerEntity, @User() user: UserEntity) {
    entity.logo = null;
    return super.createContentEntity(entity, user);
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
    @ContentEntityParam() currentEntity: CustomerEntity,
    @Body() newEntity: CustomerEntity,
  ) {
    if (newEntity.user && newEntity.user.username) {
      const customerUser = currentEntity.user;
      customerUser.username = newEntity.user.username;
      await this.usersService.updateUser(customerUser);
      delete newEntity.user;
    }
    const logo = newEntity.logo;
    newEntity.logo = null;
    let customer: CustomerEntity = await super.updateContentEntity(user, currentEntity, newEntity) as CustomerEntity;
    if (logo) {
      const jpegStartStr = 'data:image/jpeg;base64,';
      const pngStartStr = 'data:image/png;base64,';
      const isJpeg = logo.startsWith(jpegStartStr);
      const isPng = logo.startsWith(pngStartStr);
      const path = 'uploads/customers/logo';
      let fileName = 'customer-' + customer.id;
      if ( isJpeg ) {
        fileName += '.jpg';
      } else if ( isPng ) {
        fileName += '.png';
      } else {
        throw new UnprocessableEntityException('Image format is wrong');
      }
      const data = isJpeg ?
        logo.replace(jpegStartStr, '') :
        logo.replace(pngStartStr, '');
      try {
        fs.readdirSync(path);
      } catch (e) {
        fs.mkdirSync(path, { recursive: true });
      }
      const filePath = `${path}/${fileName}`;
      fs.writeFileSync(filePath, data, 'base64');
      customer.logo = `/${filePath}`;
      customer = await this.repository.save(customer);
    }
    return customer;
  }

  @Delete(':id')
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentRemoveOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentRemove];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  @SanitizeUser('user')
  async deleteContentEntity(@Param('id') id: number) {
    // TODO delete logo
    return super.deleteContentEntity(id);
  }

  protected async getQueryBuilder(user, query) {
    const hasCreditCard = query.hasCreditCard === 'true';
    const search: string = query.search;
    delete query.hasCreditCard;
    delete query.search;
    const builder = await super.getQueryBuilder(user, query);
    builder.leftJoinAndSelect('entity.user', 'user');
    builder.leftJoinAndSelect('entity.metadata', 'metadata');
    if (hasCreditCard) {
      builder.innerJoin(PaymentCardEntity, 'card', 'card.authorId = entity.userId');
    }
    if (search) {
      const strings: string[] = [];
      const numbers: number[] = [];
      const searchParts = search
        .replace(/-/g, '')
        .replace(/\+/g, '')
        .split(' ');
      searchParts.forEach(part => {
        part = part.trim();
        if (part) {
          const num = Number(part);
          if (isNaN(num)) {
            strings.push(part);
          } else {
            numbers.push(num);
          }
        }
      });
      if (strings.length || numbers.length) {
        builder
          .andWhere(new Brackets(sqb => {
            sqb
              .where('0');
            if (strings.length) {
              strings.forEach((str, idx) => {
                const fieldName = `string${idx}`;
                const params = {
                  [fieldName]: `%${str}%`,
                };
                sqb
                  .orWhere(`entity.email LIKE :${fieldName}`, params)
                  .orWhere(`entity.firstName LIKE :${fieldName}`, params)
                  .orWhere(`entity.lastName LIKE :${fieldName}`, params);
              });
            }
            if (numbers.length) {
              numbers.forEach((num, idx) => {
                const fieldName = `number${idx}`;
                const params = {
                  [fieldName]: `%${num}%`,
                };
                sqb
                // .orWhere(`entity.id LIKE :${fieldName}`, params)
                  .orWhere(`entity.phone LIKE :${fieldName}`, params);
              });
              sqb
                .orWhere(`entity.id IN (:...ids)`, { ids: numbers });
            }
          }));
      }
    }
    return builder;
  }

  private async generateSmsCode(userId, phone) {
    const smsActivation = await this.smsActivationService
      .createSmsActivation(userId);
    await this.smsActivationService.sendVerificationSms({
      phone,
      code: smsActivation.code,
      text: this.settingsService.getValue(SettingsVariablesKeys.SMSSignUpCustomerText),
    });
  }

  private async sendEmail(email: string, firstname: string) {
    if (email && !email.endsWith('@facebook.com')) {
      await this.emailSenderService
        .sendEmailToNonCustomer(email, EmailTemplates.CustomerRegistration, { firstname });
      return { success: true };
    } else {
      throw new BadRequestException();
    }
  }
}
