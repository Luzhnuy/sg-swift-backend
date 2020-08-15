import { OrderSource, OrderStatus, OrderType } from '../../orders/entities/order.entity';

export interface HasAuth {
  Key: string;
}

export interface PrepareOrderData extends HasAuth {
  ScheduledAt: string;
  LargeOrder?: boolean;
  BringBack?: boolean;
  DropOffAddress?: string;
  Type: OrderType;
  Source: OrderSource;
  CustomerName?: string;
  CustomerPhone?: string;
  CustomerEmail?: string;
  Instructions?: string;
  utcOffset?: number;
}

export interface OrderPrices {
  BaseFare: number;
  DistanceFare: number;
  LargeOrderFare: number;
  SurgeTime: boolean;
  tvq: number;
  tps: number;
  TotalAmount: number;
  DeliveryCharge: number;
  Distance: number;
  ServiceFee: number;
}

export interface PreparedOrderData {
  Token: string;
  Prices: OrderPrices;
}

export interface CreateOrderData extends HasAuth {
  Token: string;
}

export interface TrackOrderData extends HasAuth {
  Id: string;
}

export interface CancelOrderData extends HasAuth {
  Id: string;
  Reason: string;
}

export interface TrackOrderInfo {
  Id: string;
  TrackingLink: string;
  CustomerName: string;
  DeliveryAddress: string;
  CustomerPhone: string;
  Instructions: string;
  ScheduledTime: string | Date;
  DeliveryStage: string;
  DriverName?: string;
}

export interface OrdersListRequestData extends HasAuth {
  Offset?: number;
  Limit?: number;
  DeliveryStage?: OrderStatus | OrderStatus[];
  OrderType?: OrderType | OrderType[];
  Period?: Date[];
  SortBy?: 'Id' | 'ScheduledAt';
  OrderBy?: 'Asc' | 'Desc';
}

export interface OrdersListResponseData {
  Count: number;
  Orders: TrackOrderInfo[];
}

export interface ErrorResponse {
  Code: number;
  Message: string;
}
