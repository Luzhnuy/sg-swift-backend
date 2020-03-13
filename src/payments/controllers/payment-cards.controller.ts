import { Body, Controller, Delete, Get, Param, Post, Put, Query, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { Repository } from 'typeorm';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { PaymentCardEntity } from '../entities/payment-card.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { PaymentCardCredentials } from '../data/payment-card-credentials';
import * as Stripe from 'stripe';
import { InjectStripe } from 'nestjs-stripe';
import { PaymentsStripeService } from '../services/payments-stripe.service';
import { SanitizePaymentCard, SanitizePaymentCards } from '../decorators/sanitize-payment-card.decorator';
import { ContentViewUnpublishedPermissionsGuard } from '../../cms/content/guards/content-view-unpublished-permission.guard';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { ContentEntityParam } from '../../cms/content/decorators/content-entity-param.decorator';
import { ContentEntity } from '../../cms/content/entities/content.entity';
import { UsersService } from '../../cms/users/services/users.service';

@Controller('payment-cards')
@CrudEntity(PaymentCardEntity)
export class PaymentCardsController extends CrudController {
  constructor(
    @InjectRepository(PaymentCardEntity)
    protected readonly repository: Repository<PaymentCardEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
    @InjectStripe() private readonly stripeClient: Stripe,
    private paymentsStripeService: PaymentsStripeService,
    private usersService: UsersService,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Post('set-card')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  @SanitizePaymentCard()
  async setCard(@Body() credentials: PaymentCardCredentials, @User() user: UserEntity) {
    try {
      return await this.paymentsStripeService.setCardToUser(credentials, user);
    } catch (e) {
      throw new UnprocessableEntityException(e.toString());
    }
  }

  @Post('set-card/:userId')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentEdit]))
  @SanitizePaymentCard()
  async setCardToUser(
    @Body() credentials: PaymentCardCredentials,
    @Param('userId') userId: string,
    @User() user: UserEntity,
  ) {
    try {
      const cardOwner = await this.usersService.findById(userId);
      return await this.paymentsStripeService.setCardToUser(credentials, cardOwner);
    } catch (e) {
      throw new UnprocessableEntityException(e.toString());
    }
  }

  @Get('')
  @SanitizePaymentCards()
  async loadContentEntities(@User() user: UserEntity, @Query() query) {
    return super.loadContentEntities(user, query);
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
  loadContentEntity(@ContentEntityParam() entity: PaymentCardEntity) {
    if (entity) {
      entity.customerId = null;
      delete entity.customerId;
      entity.cardId = null;
      delete entity.cardId;
    }
    return entity;
  }

  @Post('')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  @SanitizePaymentCard()
  async createContentEntity(@Body() entity: ContentEntity, @User() user: UserEntity) {
    if (user.isAuthorized()) {
      entity.authorId = user.id;
      entity.moderatorId = user.id;
    } else {
      entity.authorId = null;
      entity.moderatorId = null;
    }
    // const validateResult = await entity.validate();
    const validateResult = true;
    if (validateResult === true) {
      return await this.repository.save(entity);
    } else {
      throw new UnprocessableEntityException(validateResult);
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
  @SanitizePaymentCard()
  async updateContentEntity(
    @User() user: UserEntity,
    @ContentEntityParam() currentEntity: ContentEntity,
    @Body() newEntity: ContentEntity,
  ) {
    newEntity.id = currentEntity.id;
    newEntity.authorId = currentEntity.authorId;
    newEntity.moderatorId = user.id;
    Object.assign(currentEntity, newEntity);
    // const validateResult = await currentEntity.validate();
    const validateResult = true;
    if (validateResult === true) {
      return await this.repository.save(currentEntity);
    } else {
      throw new UnprocessableEntityException(validateResult);
    }
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
  @SanitizePaymentCard()
  async deleteContentEntity(@Param('id') id: number) {
    const entity = await this.repository.findOne({ id });
    return await this.repository.remove(entity);
  }

}
