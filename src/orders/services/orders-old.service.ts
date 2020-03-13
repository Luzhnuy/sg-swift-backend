import { HttpService, Injectable } from '@nestjs/common';
import { OrderEntity, OrderSource, OrderStatus, OrderType } from '../entities/order.entity';
import { GetswiftDeliverySuccessResult, GSDeliveryStatus } from '../data/getswift-delivery-success-result';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { GetswiftDelivery } from '../data/getswift-delivery';
import { OrderItemEntity } from '../entities/order-item.entity';
import { HistoryOrder } from '../data/history-order';
import { ReplaySubject } from 'rxjs';
import { OrderMetadataEntity } from '../entities/order-metadata.entity';
import { GetswiftEvent } from '../data/getswift-event';
import { SettingsService } from '../../settings/services/settings.service';
import { PaymentsStripeService } from '../../payments/services/payments-stripe.service';
import { InjectStripe } from 'nestjs-stripe';
import * as Stripe from 'stripe';
import { CustomersService } from '../../customers/services/customers.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MerchantsService } from '../../merchants/services/merchants.service';

interface StripeCustomer {
  customer: 'OK' | 'NONE';
  customerid: string;
}

@Injectable()
export class OrdersOldService {

  constructor(
    private readonly settingsService: SettingsService,
    private readonly paymentsStripeService: PaymentsStripeService,
    private readonly customersService: CustomersService,
    private readonly merchantsService: MerchantsService,
    private readonly httpService: HttpService,
    @InjectRepository(OrderEntity) private readonly repository: Repository<OrderEntity>,
    @InjectRepository(OrderMetadataEntity)
    private readonly repositoryMetadata: Repository<OrderMetadataEntity>,
    @InjectStripe() private readonly stripeClient: Stripe,
  ) {}

  convertOrderToGetSwiftResult(order: OrderEntity): GetswiftDeliverySuccessResult {
    return {
      delivery: {
        id: order.uuid,
        reference: order.metadata.reference || 'NONE',
        created: order.createdAt.toString(),
        currentStatus: GSDeliveryStatus[order.status],
        estimatedDistance: {
          kilometres: order.metadata.distance ? order.metadata.distance.toString() : null,
        },
        deliveryFee: order.metadata.deliveryCharge ?
          order.metadata.deliveryCharge.toString() : null,
        trackingUrls: {
          www: this.settingsService.getValue(SettingsVariablesKeys.TrackOrderWeb) + order.uuid,
          api: '',
        },
      },
    };
  }

  async chargeCustomOrder(order: OrderEntity) {
    this.calcCustomTaxes(order);
    const subj = new ReplaySubject(1);
    let res;
    if (order.metadata.chargedAmount > 5000) {
      this.httpService.get<StripeCustomer>(
        this.settingsService.getValue(SettingsVariablesKeys.PhpApiUrl) +
        '/stripes/getstripecustomerid/' + order.metadata.clientId,
      ).subscribe(async (result) => {
        if (result.data.customer === 'OK') {
          try {
            res = await this.makePayment(order.metadata.chargedAmount, result.data.customerid, order);
            await this.stripeClient.refunds.create({ charge: order.metadata.chargeId });
            order.metadata.chargeId = res.id;
            subj.next(res);
            subj.complete();
          } catch (e) {
            try {
              const amount = order.metadata.chargedAmount - 5000;
              res = await this.makePayment(amount, result.data.customerid, order);
              order.metadata.chargeId2 = res.id;
              order.metadata.chargedAmount2 = amount;
              subj.next(res);
              subj.complete();
            } catch (e) {
              subj.error(e);
              subj.complete();
            }
          }
        } else {
          subj.error('Customer ' + order.metadata.clientId + ' hasn\'t Stripe card');
          subj.complete();
        }
      }, (e) => subj.error(e));
    }
    return subj.toPromise();
  }

  async convertMenuDataToOrder(data: GetswiftDelivery) {
    const order = await this.convertGetSwiftDeliveryToOrder(data);
    order.metadata.deliveryCharge = data.booking.customerFee;
    order.metadata.totalAmount = data.booking.deliveryInstructions as number;
    // order.metadata.taxes = data.booking.tax ? data.booking.tax : null;
    order.metadata.tip = data.booking.tip ? data.booking.tip : 0;
    order.metadata.description = '';
    if (data.extra) {
      order.source = data.extra.source ? data.extra.source : OrderSource.CustomerOld;
    } else {
      order.source = OrderSource.CustomerOld;
    }
    order.orderItems = data.booking.items.map(item => new OrderItemEntity(item));
    order.scheduledAt = data.booking.pickupTime ? new Date(data.booking.pickupTime) : new Date();
    order.type = OrderType.Menu;
    return order;
  }

  async convertCustomDataToOrder(data: GetswiftDelivery) {
    const order = await this.convertGetSwiftDeliveryToOrder(data);
    order.metadata.deliveryCharge = data.booking.customerFee;
    order.metadata.totalAmount = null;    // TBD
    order.metadata.tip = data.booking.tip ? data.booking.tip : 0;
    if (data.extra) {
      order.source = data.extra.source ? data.extra.source : OrderSource.CustomerOld;
    } else {
      order.source = OrderSource.CustomerOld;
    }
    order.scheduledAt = data.booking.pickupTime ? new Date(data.booking.pickupTime) : new Date();
    order.type = OrderType.Custom;
    return order;
  }

  async convertBookingDataToOrder(data: GetswiftDelivery) {
    const order = await this.convertGetSwiftDeliveryToOrder(data);
    order.metadata.totalAmount = data.booking.customerFee;
    order.scheduledAt = new Date(data.booking.pickupTime);
    order.type = OrderType.Booking;
    order.metadata.deliveryInstructions = order.metadata.description;
    if (data.extra) {
      order.metadata.chargedAmount = data.extra.amount;
      order.metadata.deliveryCharge = parseFloat(data.extra.deliveryFee);
      order.metadata.tps = parseFloat(data.extra.tps);
      order.metadata.tvq = parseFloat(data.extra.tvq);
      order.metadata.tip = 0;
      order.metadata.totalAmount = data.extra.total ?
        parseFloat(data.extra.total) : order.metadata.totalAmount;
      order.source = data.extra.source ? data.extra.source : OrderSource.Merchant;
    }
    return order;
  }

  calcMenuPricesFromHistoryData(ho: HistoryOrder, order: OrderEntity) {
    order.metadata.promoCode = ho.promocode;
    const total = ho.deliveryfee
      + ho.servicefee
      + ho.subtotal
      + ho.tip
      + parseFloat(ho.tax);
    order.metadata.discount = Math.abs(
      parseFloat(
        (total - ho.total_amount).toFixed(0),
      ),
    );
    if (order.metadata.discount < .1) { // Skip rounding errors
      order.metadata.discount = 0;
    }
    order.metadata.chargedAmount = ho.amount as number;
    order.metadata.deliveryCharge = ho.deliveryfee;
    order.metadata.totalAmount = ho.total_amount;
    order.metadata.subtotal = ho.subtotal;
    order.metadata.tip = ho.tip;
    order.metadata.tps = parseFloat(ho.tax) * 0.334;
    order.metadata.tvq = parseFloat(ho.tax) - order.metadata.tps;
  }

  calcCustomPricesFromHistoryData(ho: HistoryOrder, order: OrderEntity) {
    if (ho.promocode) {
      order.metadata.promoCode = ho.promocode;
      order.metadata.discount = parseFloat(ho.promotion);
    }
    if (ho.tipsign === '%' || [.15, .2, .25].indexOf(ho.tip) > -1) {
      order.metadata.tip = 0;
      order.metadata.tipPercent = [.15, .2, .25].indexOf(ho.tip) > -1 ?
        ho.tip * 100 : ho.tip;
    } else {
      order.metadata.tip = ho.tip || 0;
    }
  }

  public emulateGetSwiftHooks(order: OrderEntity) {
    const gsEvent = this.convertOrderToGetswiftEvent(order);
    this.httpService.post(
      this.settingsService.getValue(SettingsVariablesKeys.PhpApiUrl) + '/jobs/swifteventreceiver',
      gsEvent,
    ).subscribe(() => null, () => null);
  }

  private makePayment(amount, customerId, order) {
    return this.stripeClient.charges.create({
      amount,
      customer: customerId,
      capture: false,
      currency: 'cad',
      description: this.getLongCustomDescription(order),
    });
  }

  private async convertGetSwiftDeliveryToOrder(data: GetswiftDelivery) {
    const order = new OrderEntity();
    const metadata = new OrderMetadataEntity();
    metadata.dropOffAddress = data.booking.dropoffDetail.address;
    metadata.dropOffTitle = data.booking.dropoffDetail.name;
    metadata.dropOffPhone = data.booking.dropoffDetail.phone;
    metadata.dropOffEmail = data.booking.dropoffDetail.email;
    if (data.booking.dropoffDetail.lat) {
      metadata.dropOffLat = data.booking.dropoffDetail.lat;
    }
    if (data.booking.dropoffDetail.lon) {
      metadata.dropOffLon = data.booking.dropoffDetail.lon;
    }
    metadata.pickUpAddress = data.booking.pickupDetail.address;
    metadata.pickUpTitle = data.booking.pickupDetail.name;
    metadata.pickUpPhone = data.booking.pickupDetail.phone;
    metadata.pickUpEmail = data.booking.pickupDetail.email;
    if (data.booking.pickupDetail.lat) {
      metadata.pickUpLat = data.booking.pickupDetail.lat;
    }
    if (data.booking.pickupDetail.lon) {
      metadata.pickUpLon = data.booking.pickupDetail.lon;
    }
    metadata.deliveryInstructions = data.booking.dropoffDetail.description;
    metadata.description = data.booking.deliveryInstructions as string;
    metadata.reference = data.booking.reference;
    if (metadata.reference && metadata.reference !== 'NONE') {
      const merchant = await this.merchantsService.get(metadata.reference);
      if (merchant) {
        order.merchantId = merchant.id;
      }
    }
    if (data.extra) {
      metadata.distance = data.extra.distance ? parseFloat(data.extra.distance) : null;
      metadata.largeOrder = !!data.extra.largeorder;
      metadata.chargeId = data.extra.chargeId;
      metadata.lastFour = data.extra.lastFour;
    }
    order.metadata = metadata;
    return order;
  }

  private convertOrderToGetswiftEvent(order: OrderEntity): GetswiftEvent {
    return {
      EventName: this.getGetswiftEventName(order.status),
      Data: {
        JobIdentifier: order.uuid,
        Driver: {
          DriverName: order.driverProfile ?
            `${order.driverProfile.firstName} ${order.driverProfile.lastName}` : '',
        },
      },
    };
  }

  private getGetswiftEventName(status: OrderStatus) {
    switch (status) {
      case OrderStatus.Received: return 'job/added';
      case OrderStatus.OnWay: return 'job/onway';
      case OrderStatus.Accepted: return 'job/accepted';
      case OrderStatus.Cancelled: return 'job/cancelled';
      case OrderStatus.Completed: return 'job/finished';
    }
  }

  private calcCustomTaxes(order: OrderEntity) {
    order.metadata.customAmount = order.metadata.customAmount || 0;
    const deliveryCharge = parseFloat(order.metadata.deliveryCharge.toString());
    const serviceFee = 0.07 * (order.metadata.customAmount + deliveryCharge);
    order.metadata.serviceFee = serviceFee;
    order.metadata.tps = 0.05 * (serviceFee + deliveryCharge);
    order.metadata.tvq = 0.09975 * (serviceFee + deliveryCharge);
    order.metadata.totalAmount = order.metadata.customAmount
      + deliveryCharge + serviceFee
      + order.metadata.tps + order.metadata.tvq
      - (order.metadata.discount || 0);
    order.metadata.tip = order.metadata.tipPercent ?
      (order.metadata.tipPercent * order.metadata.totalAmount / 100) :
      parseFloat(order.metadata.tip.toString());
    order.metadata.totalAmount = order.metadata.totalAmount + order.metadata.tip;
    order.metadata.chargedAmount = Math.round(order.metadata.totalAmount * 100);
  }

  private getLongCustomDescription(order: OrderEntity) {
    let description = order.metadata.clientId +
      ' - ' +
      order.metadata.dropOffTitle +
      ' - ' +
      order.metadata.dropOffPhone +
      '-' +
      (order.metadata.dropOffEmail || '') +
      ' - Description ' +
      order.metadata.description +
      ' - Tip :' +
      order.metadata.tip +
      ' - Tip type : $';
    if (order.metadata.promoCode) {
      description += ` - Promotion : - ${order.metadata.promoCode}`;
    }
    return this.clearString(description);
  }

  public clearString(str: string) {
    return JSON.parse(JSON.stringify(str)) as string;
  }
}
