import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OrdersService } from './services/orders.service';
import { CrudEntity } from '../cms/content/decorators/crud-controller.decorator';
import { OrderEntity, OrderSource } from './entities/order.entity';
import { Subject } from 'rxjs';
import { UsersService } from '../cms/users/services/users.service';
import { CustomersService } from '../customers/services/customers.service';
import { MerchantsService } from '../merchants/services/merchants.service';
import { CustomersRolesName } from '../customers/providers/customers-config';
import { MerchantsRolesName } from '../merchants/services/merchants-config.service';

const EventName = 'orders-events';

interface OrderEvent {
  event: string;
  data: Partial<OrderEntity>;
}

@WebSocketGateway(3001, { namespace: 'orders' })
@CrudEntity(OrderEntity)
export class OrdersEventsGateway implements OnGatewayDisconnect, OnGatewayConnection {

  private $$ordersEvents = new Subject<OrderEvent>();

  @WebSocketServer()
  server: Server;

  private websockets = new Map<WebSocket, Subject<OrderEvent>>();

  constructor(
    private ordersService: OrdersService,
    private usersService: UsersService,
    private customersService: CustomersService,
    private merchantsService: MerchantsService,
  ) {
    this.ordersService
      .$ordersUpdates
      .subscribe(updates => {
        if (updates.merchant) {
          updates.merchant.user = null;
          delete updates.merchant.user;
        }
        if (updates.customer) {
          updates.customer.user = null;
          delete updates.customer.user;
        }
        if (updates.driverProfile) {
          updates.driverProfile.user = null;
          delete updates.driverProfile.user;
        }
        this.$$ordersEvents.next({
          event: EventName,
          data: updates,
        });
      });
  }

  @SubscribeMessage('orders-events')
  async handleMessage(ws, data) {
    if (!data.source) {
      return this.$$ordersEvents.asObservable();
    } else {
      const payload = this.usersService.decodeAuthToken(data.token);
      this.usersService
        .getUserOneTimeAuth(payload)
        .then(async (user) => {
          const searchParams: {
            [key: string]: string | number,
          } = {};
          const isCustomer = user.roles.find(role => role.name === CustomersRolesName.Customer);
          const isMerchant = user.roles.find(role => role.name === MerchantsRolesName.Merchant);
          if (isCustomer) {
            const customer = await this.customersService.get({ userId: user.id });
            searchParams.customerId = customer.id;
          }
          if (isMerchant) {
            const merchant = await this.merchantsService.get({ userId: user.id });
            searchParams.merchantId = merchant.id;
          }
          // TODO check for Admin
          const keys = Object.keys(searchParams);
          const subscription = this.$$ordersEvents
            .subscribe(event => {
              if (!this.websockets.get(ws)) {
                subscription.unsubscribe();
              } else {
                const isOk = keys.reduce((res, key) => {
                  // TODO compare objects deep
                  return res && event.data[key] === searchParams[key];
                }, true);
                if (isOk) {
                  this.websockets
                    .get(ws)
                    .next(event);
                }
              }
            });
        });
      return this.websockets.get(ws).asObservable();
    }
  }

  handleDisconnect(ws): any {
    this.websockets.get(ws).complete();
    this.websockets.delete(ws);
  }

  handleConnection(ws): any {
    this.websockets.set(ws, new Subject<OrderEvent>());
  }
}
