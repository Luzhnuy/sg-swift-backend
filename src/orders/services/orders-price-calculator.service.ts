import { Injectable } from '@nestjs/common';
import { OrderSource, OrderType } from '../entities/order.entity';
import { OrderExtras, OrderPrepareRequestData } from '../data/misc';
import { PromoCodesService } from '../../promo-codes/promo-codes.service';
import { CustomersService } from '../../customers/services/customers.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceCalculatorConstantEntity, PriceCalculatorConstants } from '../entities/price-calculator-constant.entity';

@Injectable()
export class OrdersPriceCalculatorService {

  private constants: Map<PriceCalculatorConstants, number> = new Map();

  constructor(
    @InjectRepository(PriceCalculatorConstantEntity) private readonly repository: Repository<PriceCalculatorConstantEntity>,
    private readonly promoCodesService: PromoCodesService,
    private readonly customersService: CustomersService,
  ) {
    this.init();
  }

  public async prepareOrder(data: OrderPrepareRequestData) {
    switch (data.type) {
      case OrderType.Menu:
        return this.calcMenuOrder(data);
      case OrderType.Custom:
        return this.calcCustomOrder(data);
      case OrderType.Booking:
        return this.calcBookingOrder(data);
      case OrderType.Trip:
        return this.calcTripOrder(data);
    }
  }

  private async calcCustomOrder(data: OrderPrepareRequestData) {
    data.extras = this.getCustomExtras(data.distance, data.scheduledTime, data.bringBack, data.largeOrder, data.arrivalAt);
    data.deliveryCharge = this.calcExtras(data.extras);
    return await this.calcTaxes(data);
  }

  private async calcBookingOrder(data: OrderPrepareRequestData) {
    data.extras = this.getBookingExtras(data.distance, data.scheduledTime, data.bringBack, data.largeOrder);
    data.deliveryCharge = this.calcExtras(data.extras);
    return await this.calcTaxes(data);
  }

  private async calcTripOrder(data: OrderPrepareRequestData) {
    data.extras = this.getTripExtras(data.distance, data.scheduledTime);
    data.deliveryCharge = this.calcExtras(data.extras);
    return await this.calcTaxes(data);
  }

  private async calcMenuOrder(data: OrderPrepareRequestData) {
    const merchant = data.merchant;
    data.extras = this.getMenuExtras(
      data.distance,
      data.scheduledTime,
      merchant && merchant.priceOverride ? merchant.priceOverride : this.getConstant(PriceCalculatorConstants.MenuBaseFare),
      merchant && merchant.distanceOverride ? merchant.distanceOverride : this.getConstant(PriceCalculatorConstants.MenuDistanceFareMinDistance),
    );
    data.deliveryCharge = this.calcExtras(data.extras);
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

  private getBookingExtras(
    distance = 0,
    scheduledTime = 0,
    bringBack = false,
    largeOrder = false,
  ): OrderExtras {
    const extras: OrderExtras = {
      baseFare: 0,
      distanceFare: 0,
      largeOrderFare: 0,
      surgeTime: false,
    };
    extras.baseFare = this.getConstant(PriceCalculatorConstants.BookingBaseFare);
    if (distance > this.getConstant(PriceCalculatorConstants.BookingDistanceFareMinDistance)) {
      const km = (
        distance >
        this.getConstant(PriceCalculatorConstants.BookingDistanceFareMaxDistance) ?
          this.getConstant(PriceCalculatorConstants.BookingDistanceFareMaxDistance) :
          (distance - this.getConstant(PriceCalculatorConstants.BookingDistanceFareMinDistance))
      ) / 1000;
      extras.distanceFare = km * this.getConstant(PriceCalculatorConstants.BookingDistanceFareKoef);
    }
    if (largeOrder) {
      extras.largeOrderFare = this.getConstant(PriceCalculatorConstants.BookingLargeOrderFare);
    }
    extras.surgeTime = this.isSurgeTime(scheduledTime);
    if (extras.surgeTime) {
      extras.baseFare += extras.baseFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
      extras.distanceFare += extras.distanceFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
      extras.largeOrderFare += extras.largeOrderFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
    }
    if (bringBack) {
      extras.baseFare += extras.baseFare * this.getConstant(PriceCalculatorConstants.BookingBringBackFareKoef);
      extras.distanceFare += extras.distanceFare * this.getConstant(PriceCalculatorConstants.BookingBringBackFareKoef);
      extras.largeOrderFare += extras.largeOrderFare * this.getConstant(PriceCalculatorConstants.BookingBringBackFareKoef);
    }
    return extras;
  }

  private getTripExtras(distance = 0, scheduledTime = 0): OrderExtras {
    const extras: OrderExtras = {
      baseFare: 0,
      distanceFare: 0,
      largeOrderFare: 0,
      surgeTime: false,
    };
    extras.baseFare = this.getConstant(PriceCalculatorConstants.TripBaseFare);
    if (distance > this.getConstant(PriceCalculatorConstants.TripDistanceFareMinDistance)) {
      const km = (
        distance >
        this.getConstant(PriceCalculatorConstants.TripDistanceFareMaxDistance) ?
          this.getConstant(PriceCalculatorConstants.TripDistanceFareMaxDistance) :
          (distance - this.getConstant(PriceCalculatorConstants.TripDistanceFareMinDistance))
      ) / 1000;
      extras.distanceFare = km * this.getConstant(PriceCalculatorConstants.TripDistanceFareKoef);
    }
    extras.surgeTime = this.isSurgeTime(scheduledTime);
    if (extras.surgeTime) {
      extras.baseFare += extras.baseFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
      extras.distanceFare += extras.distanceFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
      extras.largeOrderFare += extras.largeOrderFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
    }
    return extras;
  }

  private getCustomExtras(
    distance = 0,
    scheduledTime = 0,
    bringBack = false,
    largeOrder = false,
    arrivalAt?,
  ): OrderExtras {
    const extras: OrderExtras = {
      baseFare: 0,
      distanceFare: 0,
      largeOrderFare: 0,
      awaitingTimeFare: 0,
      surgeTime: false,
    };
    extras.baseFare = this.getConstant(PriceCalculatorConstants.CustomBaseFare);
    if (distance > this.getConstant(PriceCalculatorConstants.CustomDistanceFareMinDistance)) {
      const km = (
        distance >
        this.getConstant(PriceCalculatorConstants.CustomDistanceFareMaxDistance) ?
          this.getConstant(PriceCalculatorConstants.CustomDistanceFareMaxDistance) :
          (distance - this.getConstant(PriceCalculatorConstants.CustomDistanceFareMinDistance))
      ) / 1000;
      extras.distanceFare = km * this.getConstant(PriceCalculatorConstants.CustomDistanceFareKoef);
    }
    if (arrivalAt) {
      if (typeof arrivalAt === 'string') {
        arrivalAt = new Date(arrivalAt);
      }
      const now = new Date();
      const diff = Math.ceil((now.getTime() - arrivalAt.getTime()) / 60000);
      if (diff > 5) {
        extras.awaitingTimeFare = (diff - 5) * this.getConstant(PriceCalculatorConstants.CustomAwaitingTimeFareKoef);
      }
    }
    extras.surgeTime = this.isSurgeTime(scheduledTime);
    if (extras.surgeTime) {
      extras.baseFare += extras.baseFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
      extras.distanceFare += extras.distanceFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
      extras.awaitingTimeFare += extras.awaitingTimeFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
    }
    return extras;
  }

  private getMenuExtras(
    distance = 0,
    scheduledTime = 0,
    baseFare = this.getConstant(PriceCalculatorConstants.MenuBaseFare),
    distanceFareMinDistance = this.getConstant(PriceCalculatorConstants.MenuDistanceFareMinDistance),
  ): OrderExtras {
    const extras: OrderExtras = {
      baseFare: 0,
      distanceFare: 0,
      largeOrderFare: 0,
      surgeTime: false,
    };
    extras.baseFare = baseFare;
    let distanceDiff = distance - distanceFareMinDistance;
    if (distanceDiff > 0) {
      const distanceFareMaxDistance = this.getConstant(PriceCalculatorConstants.MenuDistanceFareMaxDistance);
      if (distanceDiff > distanceFareMaxDistance) {
        distanceDiff = distanceFareMaxDistance;
      }
      const km = distanceDiff / 1000;
      extras.distanceFare = km * this.getConstant(PriceCalculatorConstants.MenuDistanceFareKoef);
    }
    extras.surgeTime = this.isSurgeTime(scheduledTime);
    if (extras.surgeTime) {
      extras.baseFare += extras.baseFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
      extras.distanceFare += extras.distanceFare * this.getConstant(PriceCalculatorConstants.SurgeTimeKoef);
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
    if ([OrderType.Booking, OrderType.Trip, OrderType.Menu].indexOf(data.type) > -1) {
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
    const minTime = this.getConstant(PriceCalculatorConstants.SurgeTimeStart);
    const maxTime = this.getConstant(PriceCalculatorConstants.SurgeTimeEnd);
    return scheduledTime >= minTime && scheduledTime <= maxTime;
  }

  private async init() {
    const constants = await this.repository.find();
    const constantsKeys: PriceCalculatorConstants[] = Object.values(PriceCalculatorConstants);
    const existedConstants: PriceCalculatorConstants[] = constants.map(constant => constant.key);
    for (const key of constantsKeys) {
      if (existedConstants.indexOf(key) === -1) {
        let newConstant = new PriceCalculatorConstantEntity({ key });
        newConstant = await this.repository.save(newConstant);
        constants.push(newConstant);
      }
    }
    constants.forEach(constant => {
      this.constants.set(constant.key, constant.value);
    });
  }

  public async setConstant(key: PriceCalculatorConstants, value: number) {
    const constant = await this.repository.findOne( { key });
    constant.value = value;
    await this.repository.save(constant);
    this.constants.set(constant.key, constant.value);
  }

  public getConstant(key: PriceCalculatorConstants) {
    return this.constants.get(key);
  }

  public getConstantsList() {
    return this.repository.find();
  }
}
