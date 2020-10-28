import { HttpService, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderEntity, OrderSource, OrderStatus, OrderType } from '../entities/order.entity';
import { Subject } from 'rxjs';
import { DeliveryToOptions, OrderDeliveredToEntity } from '../entities/order-delivered-to.entity';
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
import { SchedulerTaskEntity } from '../../scheduler/entities/scheduler-task.entity';
import { OrdersScheduledTasksKeys } from '../data/scheduled-tasks-keys';
import { SchedulerService } from '../../scheduler/services/scheduler.service';
import { PaymentCardEntity } from '../../payments/entities/payment-card.entity';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { SettingsService } from '../../settings/services/settings.service';
import { MenuSubOptionEntity } from '../../merchants/entities/menu-sub-option.entity';
import { MerchantsService } from '../../merchants/services/merchants.service';
import { PriceCalculatorConstants } from '../entities/price-calculator-constant.entity';
import { MenuItemEntity } from '../../merchants/entities/menu-item.entity';

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
    @InjectRepository(MenuSubOptionEntity)
    protected readonly repositorySubOptions: Repository<MenuSubOptionEntity>,
    @InjectRepository(MenuItemEntity)
    protected readonly repositoryMenuItems: Repository<MenuItemEntity>,
    @InjectStripe() private readonly stripeClient: Stripe,
    private readonly httpService: HttpService,
    private geocoderService: GeocoderService,
    private paymentsStripeService: PaymentsStripeService,
    private paymentsPayPalService: PaymentsPayPalService,
    private driversService: DriversService,
    private customersService: CustomersService,
    private merchantsService: MerchantsService,
    private pushNotificationService: OrdersPushNotificationService,
    private priceCalculatorService: OrdersPriceCalculatorService,
    private oldService: OrdersOldService,
    private schedulerService: SchedulerService,
    private settingsService: SettingsService,
  ) {
    this.schedulerService
      .getThread(OrdersScheduledTasksKeys.ChargeDebt)
      .subscribe(async (task) => {
        const order = await this.repository.findOne(task.data);
        if (order) {
          if (order.metadata.debtAmount) {
            const customer = await this.customersService.get({ id: order.customerId });
            if (customer) {
              const card = await this.paymentsStripeService
                .getCardByUser(customer.userId);
              if (card) {
                try {
                  await this.payOrderDebt(order, card);
                  await this.schedulerService.removeTask(task);
                } catch (e) {
                  // tslint:disable-next-line:no-console
                  console.log(`Order "${task.data}" wasn't charged, when trying to charge debt automatically.`);
                  // tslint:disable-next-line:no-console
                  console.error(e);
                }
              } else {
                // tslint:disable-next-line:no-console
                console.log(`Order "${task.data}" wasn't charged, because customer still hasn't card`);
              }
            }
          } else {
            await this.schedulerService.removeTask(task);
            // tslint:disable-next-line:no-console
            console.log(`Debt for order "${task.data}" is already charged, when trying to charge debt automatically`);
          }
        } else {
          await this.schedulerService.removeTask(task);
          // tslint:disable-next-line:no-console
          console.error(`order "${task.data}" not found, when trying to charge debt automatically`);
        }
      });
  }

  public findOrderForApi(params) {
    return this.repository
      .findAndCount(params);
  }

  public getById(orderId: number) {
    return this.repository
      .findOne({ id: orderId});
  }

  public saveOrder(order: OrderEntity) {
    return this.repository
      .save(order);
  }

  public async assignSubOptionsToItems(order: OrderEntity) {
    const subOptionsIds = order.orderItems
      .reduce((res: number[], oi) => {
        if (oi.subOptionIds && oi.subOptionIds.length) {
          return [ ...res, ...oi.subOptionIds];
        }
        return res;
      }, []);
    if (subOptionsIds.length) {
      const subOptions = await this.repositorySubOptions
        .find({
          where: {
            id: In(subOptionsIds),
          },
        });
      const subOptionsIdsAssoc = subOptions
        .reduce((res: any, so) => {
          res[so.id] = so;
          return res;
        }, {});
      order.orderItems
        .forEach(oi => {
          if (oi.subOptionIds) {
            oi.subOptions = oi.subOptionIds
              .map(soId => subOptionsIdsAssoc[soId]);
          }
        });
    }
  }

  public async incrementInventory(order: OrderEntity) {
    // TODO implement decrement menu items
  }

  public async decrementInventory(order: OrderEntity) {
    const toUpdateItems = order.orderItems
      .reduce((res, oi) => {
        const mi = oi.menuItem;
        if (mi.inventory >= 0) {
          const totalQuantity = order.orderItems
            .filter(oi2 => oi2.menuItemId === mi.id)
            .reduce((sum, oi2) => sum + oi2.quantity, 0);
          mi.inventory = mi.inventory - totalQuantity;
          if (mi.inventory < 0) {
            mi.inventory = 0;
          }
          if (mi.quantityStopper && mi.inventory === 0) {
            mi.isPublished = false;
          }
          res.push(mi);
        }
        return res;
      }, []);
    await this.repositoryMenuItems
      .save(toUpdateItems);
  }

  public async assignMenuToItems(order: OrderEntity) {
    const menuItemIds = order.orderItems
      .map(oi => oi.menuItemId);
    if (menuItemIds.length) {
      const menuItems = await this.repositoryMenuItems
        .find({
          where: {
            id: In(menuItemIds),
          },
        });
      const soldOutMenuItem = menuItems
        .find(mi => {
          if (mi.isPublished) {
            if (mi.quantityStopper && mi.inventory >= 0) {
              const totalQuantity = order.orderItems
                .filter(oi => oi.menuItemId === mi.id)
                .reduce((sum, oi) => sum + oi.quantity, 0);
              return mi.inventory - totalQuantity < 0;
            } else {
              return false;
            }
          } else {
            return true;
          }
        });
      if (soldOutMenuItem) {
        if (soldOutMenuItem.inventory) {
          throw new UnprocessableEntityException(
            `Sorry, only ${soldOutMenuItem.inventory} ${soldOutMenuItem.name} left.`,
          );
        } else {
          throw new UnprocessableEntityException(
            `${soldOutMenuItem.name} is now sold-out. Please remove item from cart`,
          );
        }
      }
      const menuItemsIdsAssoc = menuItems
        .reduce((res: any, mi) => {
          res[mi.id] = mi;
          return res;
        }, {});
      order.orderItems
        .forEach(oi => {
          oi.menuItem = menuItemsIdsAssoc[oi.menuItemId];
        });
    }
  }

  public calcOrderItemsPrices(order: OrderEntity) {
    order
      .orderItems
      .forEach(oi => {
        oi.price = oi.quantity * (
          oi.menuItem.price
          + oi.subOptions.reduce(
            (sum, so) => sum + so.price,
            0,
          ));
      });
    order.metadata.subtotal = order.orderItems
      .reduce(
        (sum, oi) => sum + oi.price,
        0,
      );
  }

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
      if (driverProfileId === null) {
        order.driverProfileId = null;
        delete order.driverProfile;
      } else {
        order.driverProfile = await this.driversService.getSingle(driverProfileId);
      }
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
          try {
            if (order.type === OrderType.Booking) {
              if (deliveryTo.option === DeliveryToOptions.Unavailable && !order.metadata.bringBack) {
                if (order.metadata.bringBackOnUnavailable) {
                  order.metadata.bringBackOnUnavailable = true;
                  order.metadata.deliveryCharge += order.metadata.deliveryCharge * this.priceCalculatorService
                    .getConstant(PriceCalculatorConstants.BookingBringBackFareOnUnavailableKoef);
                  order.metadata.serviceFee += order.metadata.serviceFee * this.priceCalculatorService
                    .getConstant(PriceCalculatorConstants.BookingBringBackFareOnUnavailableKoef);
                  order.metadata.tps += order.metadata.tps * this.priceCalculatorService
                    .getConstant(PriceCalculatorConstants.BookingBringBackFareOnUnavailableKoef);
                  order.metadata.tvq += order.metadata.tvq * this.priceCalculatorService
                    .getConstant(PriceCalculatorConstants.BookingBringBackFareOnUnavailableKoef);
                  order.metadata.totalAmount += order.metadata.totalAmount * this.priceCalculatorService
                    .getConstant(PriceCalculatorConstants.BookingBringBackFareOnUnavailableKoef);
                } else {
                  order.metadata.chargedAmount = Math.round(order.metadata.totalAmount * 100);
                }
              } else {
                order.metadata.chargedAmount = Math.round(order.metadata.totalAmount * 100);
              }
            }
            await this.paymentsStripeService.chargeAmount(order.metadata.chargeId, order.metadata.chargedAmount);
            if (order.metadata.chargeId2) {
              await this.paymentsStripeService.chargeAmount(order.metadata.chargeId2, order.metadata.chargedAmount2 || order.metadata.chargedAmount);
            }
          } catch (e) {
            // tslint:disable-next-line:no-console
            console.error(e);
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
          // order.metadata.chargedAmount = 0;
          await this.paymentsPayPalService
            .proceedCharge(chargeId, {
              amount: {
                currency: 'CAD',
                total: '3.00',
              },
              is_final_capture: true,
            });
          order.metadata.chargedAmount = 300;
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
        // tslint:disable-next-line:no-console
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
        const scheduledAt = new Date(event.updateData.scheduledAt);
        const now = new Date();
        if (scheduledAt.getTime() - 30 * 60 * 1000 > now.getTime()) {
          this.pushNotificationService.sendDelayedNotificationToDrivers(event.updateData as OrderEntity);
        } else {
          this.pushNotificationService.sendNotificationToDrivers(event.updateData.id);
        }

      }
      const order = await this.repository.findOne(event.updateData.id);
      if (event.eventName === 'created' && order.type === OrderType.Menu) {
        this.pushNotificationService.sendNotificationToMerchant(order);
      }
      if ([OrderType.Booking, OrderType.Trip].indexOf(order.type) === -1) {
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

  public async bookOrder(order: OrderEntity, prices?: OrderPrepareRequestData) {
    await this.prepareForCharge(order, prices);
    if (!order.metadata.paymentMethod || order.metadata.paymentMethod === PaymentMethods.Stripe) {
      const cardUserId = [OrderType.Booking, OrderType.Trip].indexOf(order.type) > -1 ?
        order.merchant.userId : order.customer.userId;
      order = await this.makeStripePayment(order, cardUserId);
    } else if (order.metadata.paymentMethod === PaymentMethods.PayPal) {
      order.metadata.chargedAmount = Math.round(order.metadata.totalAmount * 100);
    } else if (order.metadata.paymentMethod === PaymentMethods.ApplePay) {
      order.metadata.chargedAmount = Math.round(order.metadata.totalAmount * 100);
    }
    return order;
  }

  public async bookTripOrders(orders: OrderEntity[]) {
    let cardUserId;
    // tslint:disable-next-line:forin
    for (const i in orders) {
      const order = orders[i];
      cardUserId = order.merchant.userId;
      await this.prepareForCharge(order);
    }
    return this.makeTripStripePayment(orders, cardUserId);
  }

  public async prepareForCharge(order: OrderEntity, prices?: OrderPrepareRequestData) {
    if (!prices) {
      const data = this.getPrepareRequestData(order);
      prices = await this.prepareOrder(data);
    }
    this.setPricesToOrder(order, prices);
  }

  public async payUserDebt(userId) {
    const customer = await this.customersService.get({ userId });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const card = await this.paymentsStripeService
      .getCardByUser(userId);
    if (!card) {
      throw new NotFoundException('You do not have a payment card. Add one now');
    }
    const orders = await this.repository
      .createQueryBuilder('order')
      .where('customerId = :customerId', { customerId: customer.id })
      .innerJoinAndSelect('order.metadata', 'metadata')
      .andWhere('metadata.debtAmount > 0')
      .getMany();
    if (orders.length) {
      for (const order of orders) {
        await this.payOrderDebt(order, card);
      }
    }
  }

  public async payExtraTipStripe(order: OrderEntity, amount: number, card: PaymentCardEntity) {
    return this.paymentsStripeService.makePayment(
      card.customerId,
      Math.round(amount),
      true,
      `Tip for oder #${order.id}`,
    );
  }

  public async payOrderDebt(order, card) {
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

  public async prepareOrder(data: OrderPrepareRequestData) {
    let distance;
    if (data.origin && data.destination) {
      distance = await this.geocoderService.getDistance(data.origin, data.destination);
      data.distance = distance;
    }
    if (data.type === OrderType.Menu) {
      if (!data.merchant && data.merchantId) {
        data.merchant = await this.merchantsService
          .getSingleById(data.merchantId);
      }
    }
    const result = await this.priceCalculatorService.prepareOrder(data);
    result.distance = distance;
    return result;
  }

  private async chargeCustomOrder(order: OrderEntity) {
    await this.prepareForCharge(order);
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
        } else {
          throw new Error('Card not found');
        }
      } catch (e) {
        await this.addDebt(order, deptAmount);
      }
    } else {
      order.metadata.chargedAmount = desiredChargedAmount;
    }
    return res;
  }

  private async makeStripePayment(order: OrderEntity, userId) {
    const card = await this.paymentsStripeService.getCardByUser(userId);
    if (!card) {
      throw new UnprocessableEntityException('User hasn\'t active credit card');
    }
    let chargedAmount: number;
    if (order.type === OrderType.Custom) {
      chargedAmount = 5000;
    } else if (order.type === OrderType.Booking) {
      if (order.metadata.bringBackOnUnavailable && !order.metadata.bringBack) {
        chargedAmount = Math.round(
          (
            order.metadata.totalAmount
            + order.metadata.totalAmount
            * this.priceCalculatorService.getConstant(PriceCalculatorConstants.BookingBringBackFareOnUnavailableKoef)
          ) * 100,
        );
      } else {
        chargedAmount = Math.round(order.metadata.totalAmount * 100);
      }
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

  private async makeTripStripePayment(orders: OrderEntity[], userId) {
    const card = await this.paymentsStripeService.getCardByUser(userId);
    if (!card) {
      throw new UnprocessableEntityException('User hasn\'t active credit card');
    }
    let merchantName: string;
    const totalChargedAmount = orders.reduce((sum, order, i) => {
      if (i === 0) {
        merchantName = order.merchant.name;
      }
      return sum + Math.round(order.metadata.totalAmount * 100);
    }, 0);
    const res = await this.paymentsStripeService.makePayment(
      card.customerId,
      totalChargedAmount,
      false,
      `Trip order for ${merchantName}`,
    );
    orders.forEach(order => {
      order.metadata.chargedAmount = Math.round(order.metadata.totalAmount * 100);
      order.metadata.chargeId = res.id;
      order.metadata.lastFour = card.last4;
    });
    return orders;
  }

  private async addDebt(order: OrderEntity, deptAmount: number) {
    const environment = this.settingsService.getValue(SettingsVariablesKeys.Environment);
    const interval = environment === 'production' ? 24 * 3600 : 300;
    order.metadata.debtAmount = deptAmount;
    order.metadata.chargedAmount2 = null;
    const hasDebt = await this.getCustomerDebt(order.customerId);
    // if (hasDebt) {
    //   throw new UnprocessableEntityException('User already has debt. Please, pay the Debt!');
    // }
    const scheduledAt = new Date();
    scheduledAt.setTime(scheduledAt.getTime() + interval * 1000);
    const task = new SchedulerTaskEntity({
      key: OrdersScheduledTasksKeys.ChargeDebt,
      interval,
      data: order.id.toString(),
      scheduledAt,
    });
    try {
      await this.schedulerService.addTask(task);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }

  public async getCustomerDebt(customerId: number) {
    const { debtAmount }  = await this.repository
      .createQueryBuilder('o')
      .select('SUM(metadata.debtAmount)', 'debtAmount')
      .leftJoin('o.metadata', 'metadata')
      .where('o.customerId = :customerId', { customerId })
      .getRawOne();
    return debtAmount ? parseInt(debtAmount, 10) : 0;
  }

  public getPrepareRequestData(order: OrderEntity) {
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
      bringBackOnUnavailable: order.metadata.bringBackOnUnavailable,
      distance: null,
      extras: null,
      customerId: order.customerId,
      merchant: order.merchant,
      merchantId: order.merchantId,
      source: order.source,
      subtotal: order.metadata.subtotal,
      promoCode: order.metadata.promoCode,
      customAmount: order.metadata.customAmount,
      arrivalAt: order.arrivalAt,
    };
    return data;
  }

  public setPricesToOrder(order: OrderEntity, prices: OrderPrepareRequestData) {
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
    order.metadata.deliveryCharge = prices.deliveryCharge;
  }
}
