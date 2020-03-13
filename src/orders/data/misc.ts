import { OrderSource, OrderType } from '../entities/order.entity';

export interface OrderExtras {
  baseFare: number;
  distanceFare: number;
  largeOrderFare: number;
  surgeTime: boolean;
}

export interface OrderPreparePriceData {
  tvq?: number;
  tps?: number;
  tip?: number;
  tipPercent?: number;
  customAmount?: number;
  totalAmount?: number;
  discount?: number;
  promoCode?: string;
  deliveryCharge?: number;
  subtotal?: number;
  serviceFee?: number;
}

export interface OrderPrepareDistanceData {
  distance: number;
}

export interface OrderPrepareData extends OrderPrepareDistanceData, OrderPreparePriceData {
  type: OrderType;
  source?: OrderSource;
  customerId?: number;
  largeOrder?: boolean;
  bringBack?: boolean;
}

export interface OrderPrepareRequestData extends OrderPrepareData {
  origin: string | { lat: number, lon: number };
  destination: string | { lat: number, lon: number };
  scheduledTime: number; // minutes
  extras: OrderExtras;
}
