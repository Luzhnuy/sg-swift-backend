import { OrderSource, OrderType } from '../../orders/entities/order.entity';

export interface HasAuth {
  key: string;
}

export interface PrepareOrderData extends HasAuth {
  scheduledAt: string;
  largeOrder?: boolean;
  bringBack?: boolean;
  dropOffAddress?: string;
  dropOffPosition?: {
    lat: number;
    lon: number;
  };
  type: OrderType;
  source: OrderSource;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  instructions?: string;
  // customerId?: number;
  // merchantId?: number;
  // promoCode?: string;
  // tip: number;
  // tipPercent: number;

  // constructor(data?: Partial<PrepareOrderData>) {
  //   super();
  //   Object.assign(this, data);
  // }
}

export interface OrderPrices {
  token: string;
  baseFare: number;
  distanceFare: number;
  largeOrderFare: number;
  surgeTime: boolean;
  tvq: number;
  tps: number;
  tip: number;
  customAmount: number;
  totalAmount: number;
  discount: number;
  deliveryCharge: number;
  subtotal: number;
  serviceFee: number;
}

export interface PreparedOrderData extends OrderPrices, PrepareOrderData {
  customerId?: number;
  merchantId?: number;
}

export interface ErrorResponse {
  code: number;
  message: string;
}
