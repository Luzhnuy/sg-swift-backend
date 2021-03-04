import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { OrderEntity, OrderStatus, OrderType } from '../entities/order.entity';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { PaymentMethods } from '../entities/order-metadata.entity';
import { EmailTemplates } from '../../email-distributor/data/email-templates';
import { SettingsService } from '../../settings/services/settings.service';
import { EmailSenderService } from '../../email-distributor/services/email-sender.service';

@Injectable()
export class OrdersEmailSenderService {

  constructor(
    private readonly settingsService: SettingsService,
    private readonly emailSenderService: EmailSenderService,
  ) {}

  async sendReceiptTrip(orders: OrderEntity[]) {
    const firstOrder = orders[0];
    const merchant = firstOrder.merchant;
    if (merchant.subscribedOnReceipt) {
      let DROPOFF_ADDR = '';
      let FEE = 0;
      let TPS = 0;
      let TVQ = 0;
      let TOTAL = 0;

      const data = {
        DATE: this.formatDate(new Date(), firstOrder.metadata.utcOffset / 60),
        MERCHANT_NAME: firstOrder.metadata.pickUpTitle,
        MERCHANT_ADDR: firstOrder.metadata.pickUpAddress,
        DROPOFF_ADDR: '',
        FEE: '',
        TPS: '',
        TVQ: '',
        TOTAL: '',
        LASTFOUR: `**** ${firstOrder.metadata.lastFour}`,
      };

      orders.forEach((o, index) => {
        DROPOFF_ADDR += `\n [ #${ index + 1} ]: ` + o.metadata.dropOffAddress;
        FEE += o.metadata.deliveryCharge;
        TPS += o.metadata.tps;
        TVQ += o.metadata.tvq;
        TOTAL += o.metadata.totalAmount;
      });

      data.DROPOFF_ADDR = DROPOFF_ADDR;
      data.FEE = this.formatNumber(FEE);
      data.TPS = this.formatNumber(TPS);
      data.TVQ = this.formatNumber(TVQ);
      data.TOTAL = this.formatNumber(TOTAL);

      return await this.emailSenderService
        .sendEmailToMerchant(
          merchant.email,
          this.getClientEmailTemplateId(firstOrder),
          data,
        );
    }
  }

  async sendReceiptBooking(order: OrderEntity) {
    const merchant = order.merchant;
    if (merchant.subscribedOnReceipt) {
      return await this.emailSenderService
        .sendEmailToMerchant(
          merchant.email,
          this.getClientEmailTemplateId(order),
          {
            DATE: this.formatDate(new Date(), order.metadata.utcOffset / 60),
            MERCHANT_NAME: order.metadata.pickUpTitle,
            MERCHANT_ADDR: order.metadata.pickUpAddress,
            DROPOFF_ADDR: order.metadata.dropOffAddress,
            FEE: this.formatNumber(order.metadata.deliveryCharge),
            TPS: this.formatNumber(order.metadata.tps),
            TVQ: this.formatNumber(order.metadata.tvq),
            TOTAL: this.formatNumber(order.metadata.totalAmount),
            LASTFOUR: `**** ${order.metadata.lastFour}`,
          },
        );
    }
  }

  sendCancelOrderEmail(order: OrderEntity) {
    const data = this.getDataForNewTemplates(order, order.type);
    const emailTemplate = EmailTemplates.AllCancelOrder;
    return [OrderType.Booking, OrderType.Trip].indexOf(order.type) > -1 ?
      this.emailSenderService
        .sendEmailToMerchant(order.merchant.email, emailTemplate, data) :
      this.emailSenderService
        .sendEmailToCustomer(order.customer.email, emailTemplate, data);
  }

  sendConfirmationEmail(data: OrderEntity | OrderEntity[]) {
    let type: OrderType;
    if (Array.isArray(data)) {
      type = OrderType.Trip;
    } else {
      type = data.type;
    }
    const emailData = this.getDataForNewTemplates(data, type);
    const emailTemplate = EmailTemplates.AllConfirmOrder;
    return [OrderType.Booking, OrderType.Trip].indexOf(type) > -1 ?
      this.emailSenderService
        .sendEmailToMerchant(data[0].merchant.email, emailTemplate, emailData) :
      this.emailSenderService
        .sendEmailToCustomer(data[0].customer.email, emailTemplate, emailData);
  }

  async sendReceiptCustomer(order: OrderEntity) {
    const customer = order.customer;
    if (customer.email.endsWith('@facebook.com')) {
      throw new UnprocessableEntityException('This user hasn\'t correct email');
    }
    return await this.emailSenderService
      .sendEmailToCustomer(
        customer.email,
        this.getClientEmailTemplateId(order),
        {
          DATE: this.formatDate(new Date(order.createdAt), -4),
          MENU: order.type,
          PICKUP: order.metadata.pickUpAddress,
          DROPOFF: order.metadata.dropOffAddress,
          ITEMS: order.type === OrderType.Custom
            ? order.metadata.description
            : order.orderItems.reduce((res, item) => {
              if (res) {
                res += ' | ';
              }
              res += `${item.quantity} x ${item.description} $${item.price}`;
              return res;
            }, ''),
          SERVICEFEE: order.metadata.serviceFee !== null ? this.formatNumber(order.metadata.serviceFee) : 'TBD',
          SUBTOTAL: order.metadata.customAmount !== null ?
            this.formatNumber(order.metadata.customAmount) :
            order.metadata.subtotal !== null ?
              this.formatNumber(order.metadata.subtotal) :
              'TBD',
          FEE: order.metadata.deliveryCharge ? this.formatNumber(order.metadata.deliveryCharge) : 'TBD',
          TPS: order.metadata.tps !== null ? this.formatNumber(order.metadata.tps) : 'TBD',
          TVQ: order.metadata.tvq !== null ? this.formatNumber(order.metadata.tvq) : 'TBD',
          TAX: order.metadata.tps !== null && order.metadata.tvq !== null ? this.formatNumber(order.metadata.tps + order.metadata.tvq) : 'TBD',
          TIP: order.metadata.tip ? order.metadata.tip : order.metadata.tipPercent ? order.metadata.tipPercent + '%' : order.metadata.tip,
          PROMO: order.metadata.promoCode,
          LASTFOUR: [PaymentMethods.ApplePay, PaymentMethods.PayPal].indexOf(order.metadata.paymentMethod) > -1
            ? order.metadata.paymentMethod : '*' + order.metadata.lastFour,
          TOTAL: order.metadata.chargedAmount !== null ? this.formatNumber(order.metadata.chargedAmount / 100) : 'TBD',
          SHOWDRIVERPHOTO: order.metadata.driverPhoto ? true : false,
          DRIVERPHOTO: order.metadata.driverPhoto ?
            this.settingsService.getValue(SettingsVariablesKeys.DriversImagesHost) + order.metadata.driverPhoto : null,
        },
      );
  }

  private getClientEmailTemplateId(order: OrderEntity) {
    if (order.type === OrderType.Custom) {
      return order.status === OrderStatus.Completed ?
        EmailTemplates.CustomerCompletedCustomOrder :
        EmailTemplates.CustomerNewCustomOrder;
    } else if (order.type === OrderType.Menu) {
      return EmailTemplates.CustomerNewMenuOrder;
    } else {
      return EmailTemplates.MerchantNewBookingOrder;
    }
  }

  private formatNumber(num: number | string) {
    num = parseFloat(num.toString());
    return num.toFixed(2);
  }

  private formatDate(d: Date, timezone: number) {
    d.setHours(d.getHours() + timezone);
    return d.toISOString()
      .replace(/T/, ' ')      // replace T with a space
      .replace(/\..+/, '');
  }

  // "new templates" are all template after May 1, 2020
  private getDataForNewTemplates(data: OrderEntity | OrderEntity[], type: OrderType) {
    // const firstName = [OrderType.Booking, OrderType.Trip].indexOf(order.type) > -1 ?
    //   order.merchant.name : order.customer.firstName;
    let orderText: string;
    let firstName: string;
    if (!Array.isArray(data)) {
      data = [data] as OrderEntity[];
    }
    switch (type) {
      case OrderType.Booking:
        firstName = data[0].merchant.name;
        orderText = data[0].metadata.deliveryInstructions;
        break;
      case OrderType.Trip:
        firstName = data[0].merchant.name;
        orderText = data.map(order => order.metadata.deliveryInstructions).join(`\n`);
        break;
      case OrderType.Menu:
        firstName = data[0].customer.firstName;
        orderText = data[0].orderItems.reduce((res, item) => {
          res += `${item.quantity} x ${item.description}    $${item.price}`;
          if (item.subOptions) {
            res += item.subOptions.map(so => `\n    - ${so.title}    $${so.price}`).join('');
          }
          res += '\n';
          return res;
        }, '');
        break;
      case OrderType.Custom:
        firstName = data[0].customer.firstName;
        orderText = data[0].metadata.description;
        break;
    }
    const { id, pickUpAddress } = data[0].metadata;
    let dropOffAddress = '';
    data.forEach((o, index) => {
      dropOffAddress += `\n [ #${ index + 1} ]: ` + o.metadata.dropOffAddress;
    });
    return {
      id,
      firstName,
      dropOffAddress,
      pickUpAddress,
      order: orderText,
      createdAt: this.formatDate(new Date(data[0].createdAt), -4),
    };
  }
}
