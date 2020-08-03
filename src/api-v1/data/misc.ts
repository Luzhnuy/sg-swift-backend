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
  utcOffset?: number;
}

export interface OrderPrices {
  baseFare: number;
  distanceFare: number;
  largeOrderFare: number;
  surgeTime: boolean;
  tvq: number;
  tps: number;
  totalAmount: number;
  deliveryCharge: number;
  distance: number;
  serviceFee: number;
}

export interface PreparedOrderData {
  token: string;
  prices: OrderPrices,
}

export interface CreateOrderData extends HasAuth {
  token: string;
}

export interface TrackOrderData extends HasAuth {
  id: string;
}

export interface CancelOrderData extends HasAuth {
  id: string;
  reason: string;
}

export interface TrackOrderInfo {
  id: string;
  trackingLink: string;
  customerName: string;
  deliveryAddress: string;
  customerPhone: string;
  instructions: string;
  scheduledTime: string | Date;
  deliveryStage: string;
  driverName?: string;
}

export interface ErrorResponse {
  code: number;
  message: string;
}
