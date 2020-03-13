import { HttpService, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderEntity, OrderSource, OrderStatus, OrderType } from '../entities/order.entity';
import { ReplaySubject, Subject } from 'rxjs';
import { OrderDeliveredToEntity } from '../entities/order-delivered-to.entity';
import { OrderMetadataEntity, PaymentMethods } from '../entities/order-metadata.entity';
import { InjectStripe } from 'nestjs-stripe';
import * as Stripe from 'stripe';
import { GeocoderService } from '../../geocoder/services/geocoder.service';
import { PaymentsStripeService } from '../../payments/services/payments-stripe.service';
import { DriversService } from '../../drivers/services/drivers.service';
import { CustomersService } from '../../customers/services/customers.service';
import { PaymentsPayPalService } from '../../payments/services/payments-pay-pal.service';
import { OrdersPushNotificationService } from './orders-push-notification.service';
import { OrderPrepareRequestData } from '../data/misc';
import { OrdersPriceCalculatorService } from './orders-price-calculator.service';
import { OrdersOldService } from './orders-old.service';

@Injectable()
export class OrdersService {

  private $$ordersUpdates = new Subject<Partial<OrderEntity>>();
  public $ordersUpdates = this.$$ordersUpdates.asObservable();

  constructor(
    @InjectRepository(OrderEntity) private readonly repository: Repository<OrderEntity>,
    @InjectRepository(OrderMetadataEntity)
      private readonly repositoryMetadata: Repository<OrderMetadataEntity>,
    @InjectRepository(OrderDeliveredToEntity)
      private readonly repositoryOrderDeliveredTo: Repository<OrderDeliveredToEntity>,
    @InjectStripe() private readonly stripeClient: Stripe,
    private readonly httpService: HttpService,
    private geocoderService: GeocoderService,
    private paymentsStripeService: PaymentsStripeService,
    private paymentsPayPalService: PaymentsPayPalService,
    private driversService: DriversService,
    private customersService: CustomersService,
    private pushNotificationService: OrdersPushNotificationService,
    private priceCalculatorService: OrdersPriceCalculatorService,
    private oldService: OrdersOldService,
  ) {}

  public async updateOrderStatus(
    order: OrderEntity,
    status: OrderStatus,
    driverProfileId?: number | null,
    deliveryTo?: OrderDeliveredToEntity,
    customAmount?: number,
    cancellationReason?: string,
    skipRefundingOnCancel = false,
    customerCancellation = false,
  ) {
    order.status = status;
    if (typeof driverProfileId !== 'undefined') {
      order.driverProfile = await this.driversService.getSingle(driverProfileId);
    }
    if (typeof customAmount !== 'undefined') {
      order.metadata.customAmount = customAmount;
    }
    if (typeof cancellationReason !== 'undefined') {
      order.metadata.cancellationReason = cancellationReason;
    }
    try {
      if (
        order.status === OrderStatus.Completed
      ) {
        if ([PaymentMethods.Stripe, PaymentMethods.ApplePay].indexOf(order.metadata.paymentMethod) > -1) {
          await this.paymentsStripeService.chargeAmount(order.metadata.chargeId, order.metadata.chargedAmount);
          if (order.metadata.chargeId2) {
            await this.paymentsStripeService.chargeAmount(order.metadata.chargeId2, order.metadata.chargedAmount2 || order.metadata.chargedAmount);
          }
        } else if (order.metadata.paymentMethod === PaymentMethods.PayPal) {
          const chargeId = order.metadata.chargeId.split('-----')[1];
          const total = (order.metadata.chargedAmount / 100).toFixed(2);
          await this.paymentsPayPalService
            .proceedCharge(chargeId, {
              amount: {
                currency: 'CAD',
                total,
              },
              is_final_capture: true,
            });
        }
      } else if (
        order.status === OrderStatus.OnWay
        &&
        order.type === OrderType.Custom
      ) {
        if (order.source === OrderSource.CustomerOld) {
          await this.oldService.chargeCustomOrder(order);
        } else {
          await this.chargeCustomOrder(order);
        }
      } else if (
        order.status === OrderStatus.Cancelled
        &&
        !skipRefundingOnCancel
      ) {
        if ([PaymentMethods.Stripe, PaymentMethods.ApplePay].indexOf(order.metadata.paymentMethod) > -1) {
          try {
            if (customerCancellation) {
              await this.paymentsStripeService.chargeAmount(order.metadata.chargeId, 300);
              order.metadata.chargedAmount = 300;
            } else {
              await this.stripeClient.refunds.create({ charge: order.metadata.chargeId });
              if (order.metadata.chargeId2) {
                await this.stripeClient.refunds.create({ charge: order.metadata.chargeId2 });
              }
              order.metadata.chargedAmount = 0;
            }
          } catch (e) {
            // payment can be already refunded by customer app. It's correct behaviour
            // console.error(e);
          }
        } else if (PaymentMethods.PayPal === order.metadata.paymentMethod) {
          const chargeId = order.metadata.chargeId.split('-----')[1];
          order.metadata.chargedAmount = 0;
          await this.paymentsPayPalService
            .proceedCharge(chargeId, {
              amount: {
                currency: 'CAD',
                total: '3.00',
              },
              is_final_capture: true,
            });
        }
      }
    } catch (e) {
      throw e;
    }
    order = await this.repository.save(order);
    if (deliveryTo) {
      try {
        await this.repositoryOrderDeliveredTo.save(new OrderDeliveredToEntity({
          orderId: order.id,
          ...deliveryTo,
        }));
      } catch (e) {
        console.error(e);
      }
    }

    this.emitOrderUpdate({
      eventName: 'status-changed',
      updateData: {
        id: order.id,
        status,
        driverProfile: order.driverProfile,
        acceptedAt: order.acceptedAt,
        onWayAt: order.onWayAt,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt,
        customerId: order.customerId,
        merchantId: order.merchantId,
        driverProfileId: order.driverProfileId,
      },
    });
    return order;
  }

  public async emitOrderUpdate(event: {
    eventName: 'status-changed' | 'created' | 'updated';
    updateData: Partial<OrderEntity>;
  }) {
    this.$$ordersUpdates.next(event.updateData);
    if (['status-changed', 'created'].indexOf(event.eventName) > -1) {
      if (event.eventName === 'created') {
        this.pushNotificationService.sendNotificationToDrivers(event.updateData.id);
      }
      const order = await this.repository.findOne(event.updateData.id);
      if (order.type !== OrderType.Booking) {
        this.pushNotificationService.sendNotificationToCustomers(order);
        this.oldService.emulateGetSwiftHooks(order);
      }
    }
  }

  public countActiveOrderByDriverId(driverId) {
    return this.repository
      .createQueryBuilder('order')
      .where('order.status IN (:statuses)')
      .andWhere('order.driverProfileId = :driverId')
      .setParameters({ driverId, statuses: [ OrderStatus.OnWay, OrderStatus.Accepted] })
      .getCount();
  }

  private async chargeCustomOrder(order: OrderEntity) {
    const data = this.getPrepareRequestData(order);
    const prices = await this.prepareOrder(data);

    this.setPricesToOrder(order, prices);
    const subj = new ReplaySubject(1);
    let res;
    const desiredChargedAmount = Math.round(order.metadata.totalAmount * 100);
    if (desiredChargedAmount > 5000) {
      let card;
      if (order.customer) {
        card = await this.paymentsStripeService
          .getCardByUser(order.customer.userId);
      }
      const deptAmount = desiredChargedAmount - order.metadata.chargedAmount;
      try {
        if (card) {
          res = await this.paymentsStripeService.makePayment(
            card.customerId,
            desiredChargedAmount,
            false,
            order.metadata.description,
          );
          await this.stripeClient.refunds.create({ charge: order.metadata.chargeId });
          order.metadata.chargeId = res.id;
          order.metadata.chargedAmount = desiredChargedAmount;
          subj.next(res);
        } else {
          throw new Error('Card not found');
        }
      } catch (e) {
        await this.addDebt(order, deptAmount);
      } finally {
        subj.complete();
      }
    }
    return res;
  }

  public async bookOrder(order: OrderEntity) {
    const data = this.getPrepareRequestData(order);
    const prices = await this.prepareOrder(data);
    this.setPricesToOrder(order, prices);
    if (order.metadata.paymentMethod === PaymentMethods.Stripe) {
      const cardUserId = order.type === OrderType.Booking ?
        order.merchant.userId : order.customer.userId;
      order = await this.makeStripePayment(order, cardUserId);
    } else if (order.metadata.paymentMethod === PaymentMethods.PayPal) {
      order.metadata.chargedAmount = Math.round(order.metadata.totalAmount * 100);
    } else if (order.metadata.paymentMethod === PaymentMethods.ApplePay) {
      order.metadata.chargedAmount = Math.round(order.metadata.totalAmount * 100);
    }
    return order;
  }

  public async payUserDebt(userId) {
    const customer = await this.customersService.get({ userId });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const orders = await this.repository
      .createQueryBuilder('order')
      .where('customerId = :customerId', { customerId: customer.id })
      .innerJoinAndSelect('order.metadata', 'metadata')
      .andWhere('metadata.debtAmount > 0')
      .getMany();

    if (orders.length) {
      const card = await this.paymentsStripeService
        .getCardByUser(userId);
      for (const order of orders) {
        const deptAmount = await this.payOrderDebt(order, card);
        customer.metadata.debtAmount -= deptAmount;
        await this.customersService.saveMetadata(customer.metadata);
      }
    }
  }

  public async prepareOrder(data: OrderPrepareRequestData) {
    if (data.origin && data.destination) {
      data.distance = await this.geocoderService.getDistance( data.origin, data.destination );
    }
    return this.priceCalculatorService.prepareOrder(data);
  }

  private async makeStripePayment(order: OrderEntity, userId) {
    const card = await this.paymentsStripeService.getCardByUser(userId);
    if (!card) {
      throw new UnprocessableEntityException('User hasn\'t active credit card');
    }
    let chargedAmount: number;
    if (order.type === OrderType.Custom) {
      chargedAmount = 5000;
    } else {
      chargedAmount = Math.round(order.metadata.totalAmount * 100);
    }
    const res = await this.paymentsStripeService.makePayment(
      card.customerId,
      chargedAmount,
      false,
      order.metadata.description,
    );
    order.metadata.chargedAmount = chargedAmount;
    order.metadata.chargeId = res.id;
    order.metadata.lastFour = card.last4;
    return order;
  }

  private async addDebt(order, deptAmount) {
    order.metadata.debtAmount = deptAmount;
    order.metadata.chargedAmount2 = null;
    order.customer.metadata.debtAmount = (order.customer.metadata.debtAmount || 0) + deptAmount;
    await this.customersService
      .saveMetadata(order.customer.metadata);
    const tryCharge = async (orderId, userId) => {
      const orderUptime = await this.repository.findOne(orderId);
      const cardUptime = await this.paymentsStripeService
        .getCardByUser(userId);
      if (orderUptime.metadata.debtAmount) {
        try {
          await this.payOrderDebt(orderUptime, cardUptime);
        } catch (e) {
          setTimeout(() => {
            tryCharge(orderId, userId);
          }, 48 * 3600 * 1000);
        }
      }
    };
    setTimeout((orderId, userId) => {
      tryCharge(orderId, userId);
    }, 48 * 3600 * 1000, [order.id, order.customer.userId]);
  }

  private async payOrderDebt(order, card) {
    const res = await this.paymentsStripeService.makePayment(
      card.customerId,
      order.metadata.debtAmount,
      true,
      order.metadata.description,
    );
    const orderDebt = order.metadata.debtAmount;
    order.metadata.chargeId2 = res.id;
    order.metadata.chargedAmount2 = orderDebt;
    order.metadata.debtAmount = 0;
    await this.repositoryMetadata.save(order.metadata);
    return orderDebt;
  }

  private setPricesToOrder(order: OrderEntity, prices: OrderPrepareRequestData) {
    order.metadata.distance = prices.distance;
    order.metadata.discount = prices.discount;
    order.metadata.tip = prices.tip;
    order.metadata.tipPercent = prices.tipPercent;
    order.metadata.subtotal = prices.subtotal;
    order.metadata.serviceFee = prices.serviceFee;
    order.metadata.totalAmount = prices.totalAmount;
    order.metadata.tvq = prices.tvq;
    order.metadata.tps = prices.tps;
    order.metadata.customAmount = prices.customAmount;
  }

  private getPrepareRequestData(order: OrderEntity) {
    const data: OrderPrepareRequestData = {
      origin: { lat: order.metadata.pickUpLat, lon: order.metadata.pickUpLon },
      destination: { lat: order.metadata.dropOffLat, lon: order.metadata.dropOffLon },
      scheduledTime: order.metadata.scheduledTime, // minutes
      tip: order.metadata.tip,
      tipPercent: order.metadata.tipPercent,
      discount: order.metadata.discount,
      type: order.type,
      largeOrder: order.metadata.largeOrder,
      bringBack: order.metadata.bringBack,
      distance: null,
      extras: null,
      customerId: order.customerId,
      source: order.source,
      subtotal: order.metadata.subtotal,
      promoCode: order.metadata.promoCode,
      customAmount: order.metadata.customAmount,
    };
    return data;
  }
}
