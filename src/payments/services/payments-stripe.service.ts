import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PaymentCardEntity } from '../entities/payment-card.entity';
import { Repository } from 'typeorm';
import { InjectStripe } from 'nestjs-stripe';
import { InjectRepository } from '@nestjs/typeorm';
import * as Stripe from 'stripe';
import { PaymentCardCredentials } from '../data/payment-card-credentials';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { RolesAndPermissionsRolesName } from '../../cms/roles-and-permissions/services/roles-and-permissions-config.service';

@Injectable()
export class PaymentsStripeService {

  constructor(
    @InjectRepository(PaymentCardEntity)
    protected readonly repository: Repository<PaymentCardEntity>,
    @InjectStripe() private readonly stripeClient: Stripe,
  ) {

  }

  async setCardToUser(credentials: PaymentCardCredentials, user: UserEntity) {
    const isAdmin = !!user.roles.find(role => role.name === RolesAndPermissionsRolesName.Admin);
    const userId = isAdmin ? credentials.userId : user.id;
    let card = await this.repository.findOne({
      authorId: userId,
    });
    if (!card) {
      card = new PaymentCardEntity({
        authorId: userId,
        moderatorId: user.id,
      });
    }
    let customer: any;
    if (card.id) {
      customer = await this.stripeClient
        .customers
        .update(card.customerId, {
          email: user.username,
          description: user.id.toString(),
          source: {
            object: 'card',
            number: credentials.number.toString(),
            exp_month: credentials.month,
            exp_year: credentials.year,
            cvc: credentials.cvc,
            name: credentials.name,
          },
        });
    } else {
      customer = await this.stripeClient
        .customers
        .create({
          email: user.username,
          description: user.id.toString(),
          source: {
            object: 'card',
            number: credentials.number.toString(),
            exp_month: credentials.month,
            exp_year: credentials.year,
            cvc: credentials.cvc,
            name: credentials.name,
          },
        });
    }
    card.brand = customer.sources.data[0].brand;
    card.last4 = customer.sources.data[0].last4;
    card.cardId = customer.sources.data[0].id;
    card.customerId = customer.id;
    return this.repository.save(card);
  }

  async getCardByUser(user: number | UserEntity) {
    const userId = /^\d+$/.test(user.toString()) ? (user as number) : (user as UserEntity).id;
    const card = await this.repository.findOne({ authorId: userId });
    return card;
  }

  makePayment(customerId: string, amount: number, capture = false, description: string = '', currency = 'cad') {
    return this.stripeClient.charges.create({
      amount,
      customer: customerId,
      capture: false,
      currency,
      description,
    });
  }

  chargeAmount(chargeId: string, amount: number) {
    return this.stripeClient.charges.capture(chargeId, { amount });
  }

  createCharge(data) {
    return this.stripeClient.charges.create(data);
  }

  checkCharge(chargeId: string) {
    return this.stripeClient.charges.retrieve(chargeId);
  }

}
