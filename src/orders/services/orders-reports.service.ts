import { Injectable } from '@nestjs/common';
import { OrderEntity, OrderStatus } from '../entities/order.entity';

@Injectable()
export class OrdersReportsService {

  public convertOrdersToCSV(orders: OrderEntity[], timezone = -4) {
    let rows = [
      [
        'Order #', 'Type', 'Reference #', 'Current Stage', 'Subtotal Price (merchant orders)', 'Purchase Total (Custom Order)',
        'Delivery fee,', 'Service Fee (7%)', 'Tip $', 'TPS', 'TVQ', 'Promo code $', 'Total Charged', 'Created Time', 'Scheduled Time',
        'Accepted Time', 'On Way Time', 'Completed Time', 'Cancelled Time', 'instructions', 'Driver Name', 'Driver ID',
        'Pick up address', 'Pick up email (username)', 'Pick up phone', 'Drop-off name', 'Drop-off address', 'Drop-off phone',
        'Drop-off e-mail', 'Drop-off marketing email',
        'Accepted to pickup (in mintues)', 'Pick-up to completed (in minutes)', 'Distance in KM (pick up to drop off)',
      ],
    ];

    rows = [
      ...rows,
      ...orders.map((order: OrderEntity) => {
        const row = [];
        row.push(order.id);
        row.push(order.type);
        row.push(order.metadata.reference);
        row.push(order.status);
        row.push(order.metadata.subtotal !== null ? this.formatNumber(order.metadata.subtotal) : '');
        row.push(order.metadata.customAmount !== null ? this.formatNumber(order.metadata.customAmount) : '');
        row.push(order.metadata.deliveryCharge !== null ? this.formatNumber(order.metadata.deliveryCharge) : '');
        row.push(order.metadata.serviceFee !== null ? this.formatNumber(order.metadata.serviceFee) : '');
        row.push(order.metadata.tip !== null ? this.formatNumber(order.metadata.tip) : '');
        row.push(order.metadata.tps !== null ? this.formatNumber(order.metadata.tps) : 'TBD');
        row.push(order.metadata.tvq !== null ? this.formatNumber(order.metadata.tvq) : 'TBD');
        row.push(order.metadata.discount !== null ? this.formatNumber(order.metadata.discount) : '');
        row.push(order.metadata.chargedAmount !== null ? this.formatNumber(order.metadata.chargedAmount / 100) : '');
        row.push(this.formatDate(new Date(order.createdAt), timezone));
        row.push(this.formatDate(new Date(order.scheduledAt), timezone));
        row.push(order.acceptedAt ? this.formatDate(new Date(order.acceptedAt), timezone) : '');
        row.push(order.onWayAt ? this.formatDate(new Date(order.onWayAt), timezone) : '');
        row.push(order.completedAt ? this.formatDate(new Date(order.completedAt), timezone) : '');
        row.push(order.cancelledAt ? this.formatDate(new Date(order.cancelledAt), timezone) : '');
        row.push(order.metadata.description !== null ? order.metadata.description : '');
        row.push(order.driverProfile !== null ? order.driverProfile.firstName + ' ' + order.driverProfile.lastName : '');
        row.push(order.driverProfile !== null ? order.driverProfile.id : '');
        row.push(order.metadata.pickUpAddress !== null ? order.metadata.pickUpAddress : '');
        row.push(order.metadata.pickUpEmail !== null ? order.metadata.pickUpEmail : '');
        row.push(order.metadata.pickUpPhone !== null ? order.metadata.pickUpPhone : '');
        row.push(order.metadata.dropOffTitle !== null ? order.metadata.dropOffTitle : '');
        row.push(order.metadata.dropOffAddress !== null ? order.metadata.dropOffAddress : '');
        row.push(order.metadata.dropOffPhone !== null ? order.metadata.dropOffPhone : '');
        row.push(order.metadata.dropOffEmail !== null ? order.metadata.dropOffEmail : '');
        row.push(order.customer ? order.customer.email : '');

        if (order.status === OrderStatus.Completed) {
          row.push(this.dateDiffInMinutes(new Date(order.acceptedAt), new Date(order.onWayAt)));
          row.push(this.dateDiffInMinutes(new Date(order.onWayAt), new Date(order.completedAt)));
        } else if (order.status === OrderStatus.OnWay) {
          row.push(this.dateDiffInMinutes(new Date(order.acceptedAt), new Date(order.onWayAt)));
          row.push('');
        } else {
          row.push('');
          row.push('');
        }
        row.push(order.metadata.distance !== null ? (order.metadata.distance / 1000).toFixed(1) : '');
        return row;
      }),
    ];

    return this.arraysToCSV(rows);
  }

  private arraysToCSV(arrs) {
    return arrs.map(arr => {
      return '"' + arr
        .map(el => {
          if (typeof el === 'string') {
            return el.replace(/"/g, '"""');
          }
          return el;
        })
        .join('","') + '"';
    }).join('\r\n');
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

  private dateDiffInMinutes(d1: Date, d2: Date) {
    const minDiff = Math.round((d2.getTime() - d1.getTime()) / 60000);
    return minDiff;
  }

}
