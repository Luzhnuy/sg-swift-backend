import { Injectable } from '@nestjs/common';
import { OrderSource, OrderType } from '../entities/order.entity';
import { OrderExtras, OrderPrepareRequestData } from '../data/misc';
import { PromoCodesService } from '../../promo-codes/promo-codes.service';
import { CustomersService } from '../../customers/services/customers.service';

@Injectable()
export class OrdersPriceCalculatorService {

  constructor(
    private readonly promoCodesService: PromoCodesService,
    private readonly customersService: CustomersService,
  ) {}

  public async prepareOrder(data: OrderPrepareRequestData) {
    switch (data.type) {
      case OrderType.Menu:
        return this.calcMenuOrder(data);
      case OrderType.Custom:
        return this.calcCustomOrder(data);
      case OrderType.Booking:
        return this.calcBookingOrder(data);
    }
  }

  private async calcCustomOrder(data: OrderPrepareRequestData) {
    data.extras = this.getExtras(data.distance, data.scheduledTime, data.bringBack, data.largeOrder);
    data.deliveryCharge = this.calcExtras(data.extras);
    return await this.calcTaxes(data);
  }

  private async calcBookingOrder(data: OrderPrepareRequestData) {
    data.extras = this.getExtras(data.distance, data.scheduledTime, data.bringBack, data.largeOrder);
    // data.deliveryCharge = Object.values(data.extras).reduce((sum, val) => (sum + val), 0);
    data.deliveryCharge = this.calcExtras(data.extras);
    return await this.calcTaxes(data);
  }

  private async calcMenuOrder(data: OrderPrepareRequestData) {
    data.deliveryCharge = 4.99;
    data.extras = {
      surgeTime: this.isSurgeTime(data.scheduledTime),
      baseFare: data.deliveryCharge,
      distanceFare: 0,
      largeOrderFare: 0,
    };
    if (data.extras.surgeTime) {
      data.deliveryCharge *= 1.2;
    }
    return await this.calcTaxes(data);
  }

  private calcExtras(extras: OrderExtras) {
    return Object.values(extras).reduce((sum, val) => {
      const numVal = parseFloat(val);
      if (!isNaN(numVal)) {
        sum += numVal;
      }
      return sum;
    }, 0);
  }

  private getExtras(distance = 0, scheduledTime = 0, bringBack = false, largeOrder = false): OrderExtras {
    const extras: OrderExtras = {
      baseFare: 0,
      distanceFare: 0,
      largeOrderFare: 0,
      surgeTime: false,
    };
    extras.baseFare = 12.99;
    if (distance > 3000) {
      const km = distance > 20000 ? 20 : (distance - 3000) / 1000;
      extras.distanceFare = km * 1.5;
    }
    if (largeOrder) {
      extras.largeOrderFare = 3.33;
    }
    extras.surgeTime = this.isSurgeTime(scheduledTime);
    if (extras.surgeTime) {
      extras.baseFare += extras.baseFare * .2;
      extras.distanceFare += extras.distanceFare * .2;
      extras.largeOrderFare += extras.largeOrderFare * .2;
    }
    if (bringBack) {
      extras.baseFare += extras.baseFare * .55;
      extras.distanceFare += extras.distanceFare * .55;
      extras.largeOrderFare += extras.largeOrderFare * .55;
    }
    return extras;
  }

  private async calcTaxes(data: OrderPrepareRequestData) {
    data.discount = 0;
    if (data.type !== OrderType.Booking && data.source === OrderSource.Customer) {
      let promoUsed = false;
      if (data.promoCode) {
        const promoCode = await this.promoCodesService.getByCode(data.promoCode);
        if (promoCode) {
          promoUsed = true;
          data.discount = -promoCode.discount;
        } else {
          data.promoCode = null;
        }
      }
      if (!promoUsed && data.type === OrderType.Menu) {
        const customer = await this.customersService
          .get({
            id: data.customerId,
          });
        if (customer.metadata.credit >= 5) {
          data.discount = -5;
        }
      }
    }
    if (
      data.type === OrderType.Booking ||
      data.type === OrderType.Menu
    ) {
      const subtotal = data.subtotal || 0;
      data.tps = .05 * (data.deliveryCharge + subtotal + data.discount);
      data.tvq = .09975 * (data.deliveryCharge + subtotal + data.discount);
      data.totalAmount = data.deliveryCharge + subtotal + data.tps + data.tvq + data.discount;
      if (data.tipPercent) {
        data.tip = (subtotal + data.deliveryCharge) * data.tipPercent;
      }
      data.tip = data.tip || 0;
      data.totalAmount += data.tip;
    } else if (data.type === OrderType.Custom) {
      if (data.customAmount || data.customAmount === 0) {
        data.serviceFee = .07 * (data.deliveryCharge + data.customAmount);
        data.tps = .05 * (data.deliveryCharge + data.serviceFee + data.discount);
        data.tvq = .09975 * (data.deliveryCharge + data.serviceFee + data.discount);
        data.totalAmount = data.deliveryCharge + data.serviceFee + data.customAmount + data.tps + data.tvq + data.discount;
        if (data.tipPercent) {
          data.tip = data.totalAmount * data.tipPercent;
        }
        data.tip = data.tip || 0;
        data.totalAmount += data.tip;
      } else {
        data.tps = null;
        data.tvq = null;
        data.totalAmount = null;
      }
    }
    return data;
  }

  private isSurgeTime(scheduledTime): boolean {
    const minTime = 945; // 15:45 = 15 * 60 + 45;
    const maxTime = 1080; // 18:00 = 18 * 60;
    return scheduledTime >= minTime && scheduledTime <= maxTime;
  }
}
