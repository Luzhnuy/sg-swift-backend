import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { OrderEntity, OrderStatus, OrderType } from '../entities/order.entity';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { PaymentMethods } from '../entities/order-metadata.entity';
import { EmailTemplates } from '../../email-distributor/data/email-templates';
import { SettingsService } from '../../settings/services/settings.service';
import { SendGridService } from '@anchan828/nest-sendgrid';

@Injectable()
export class OrdersEmailSenderService {

  constructor(
    private readonly settingsService: SettingsService,
    private readonly sendGrid: SendGridService,
  ) {}

  async sendReceiptBooking(order: OrderEntity) {
    const merchant = order.merchant;
    if (merchant.subscribedOnReceipt) {
      return await this.sendGrid.send({
        to: merchant.email,
        from: {
          email: this.settingsService.getValue(SettingsVariablesKeys.SupportEmail),
          name: 'SnapGrab',
        },
        subject: 'SnapGrab - Success order',
        templateId: this.getClientEmailTemplateId(order),
        dynamicTemplateData: {
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
      });
    }
  }

  async sendReceiptCustomer(order: OrderEntity) {
    const customer = order.customer;
    if (customer.email.endsWith('@facebook.com')) {
      throw new UnprocessableEntityException('This user hasn\'t correct email');
    }
    await this.sendGrid.send({
      to: customer.email,
      from: {
        email: this.settingsService.getValue(SettingsVariablesKeys.SupportEmail),
        name: 'SnapGrab',
      },
      subject: 'Success Order',
      templateId: this.getClientEmailTemplateId(order),
      dynamicTemplateData: {
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
    });
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
}
