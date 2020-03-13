import { OrderSource, OrderType } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';

export class GetswiftDelivery {

  ApiKey: string;

  booking: {
    parentOrder?: string;
    pickupDetail: {
      name: string,
      phone?: string,
      address: string,
      description: string,
      email: string,
      lat?: number,
      lon?: number,
    },
    dropoffDetail: {
      customerFee?: number,
      address: string,
      description: string,
      name: string,
      phone: string,
      zipcode?: string,
      email: string,
      lat?: number,
      lon?: number,
    },
    reference?: string,
    pickupTime: string,
    tip: number,
    tax?: number,
    customerFee: number,
    deliveryInstructions: number | string,
    items?: OrderItemEntity[],
  };

  extra?: {
    distance: string;
    bringback: 0 | 1;
    largeorder: 0 | 1;
    createdDate: string;
    deliveryFee: string;
    lastFour: string;
    total: string;
    tps?: string;
    tvq?: string;
    source?: OrderSource,
    type?: OrderType,
    chargeId?: string;
    amount?: number,
  };

  constructor(init: Partial<GetswiftDelivery>) {
    Object.assign(this, init);
  }
}
