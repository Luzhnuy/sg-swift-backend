import { Injectable } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestOrderEntity } from '../entities/test-order.entity';
import { OrderEntity, OrderSource, OrderStatus, OrderType } from '../entities/order.entity';
import { OrderPrepareRequestData } from '../data/misc';
import { PaymentMethods } from '../entities/order-metadata.entity';
import { OrderDeliveredToEntity } from '../entities/order-delivered-to.entity';

@Injectable()
export class TestOrdersService {

  constructor(
    @InjectRepository(TestOrderEntity) private readonly repository: Repository<TestOrderEntity>,
    private ordersService: OrdersService,
  ) {
  }

  public findOrderForApi(params) {
    return this.repository
      .findAndCount(params);
  }

  public async bookOrder(order: TestOrderEntity, prices?: OrderPrepareRequestData) {
    if (!prices) {
      const data = this.ordersService
        .getPrepareRequestData(order as any);
      prices = await this.ordersService
        .prepareOrder(data);
    }
    this.ordersService
      .setPricesToOrder(order as any, prices);
    order.metadata.chargedAmount = Math.round(order.metadata.totalAmount * 100);
    return order;
  }

  public saveOrder(order: TestOrderEntity) {
    return this.repository
      .save(order);
  }

  public getById(orderId: number) {
    return this.repository
      .findOne({ id: orderId});
  }

  public async updateOrderStatus(
    order: TestOrderEntity,
    status: OrderStatus,
    driverProfileId?: number | null,
    deliveryTo?: OrderDeliveredToEntity,
    customAmount?: number,
    cancellationReason?: string,
    skipRefundingOnCancel = false,
    customerCancellation = false,
  ) {
    order.status = status;
    if (typeof cancellationReason !== 'undefined') {
      order.metadata.cancellationReason = cancellationReason;
    }
    order = await this.repository.save(order);
    return order;
  }
}
