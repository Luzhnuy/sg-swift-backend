export enum HistoryOrderPaymentMethods {
  ApplePay = 'Apple Pay',
  Stripe = 'Stripe',
  PayPal = 'PayPal',
}

export class HistoryOrder {
  id?: string;
  userid: string;
  description: string;
  largedescription?: string;
  amount: number | 'TBD';
  photo: string | null;
  promotion: string;
  largdescription?: string;
  tip: number;
  tipsign: string;
  deliveryfee: number;
  subtotal: number;
  tax: string;
  servicefee: number;
  total_amount: number;

  promocode: string;
  chargeid: string;
  jobid: string;
  type: 'menu - Merchant' | 'custom';
  localtime: number;
  status?: 'Received' | 'Accepted' | 'PickedUp' | 'Completed' | 'Cancelled';
  created?: string;
  trackingUrls?: string;
  paymentmethod: HistoryOrderPaymentMethods = HistoryOrderPaymentMethods.Stripe;
  last4: string | null;

  public constructor(init?: Partial<HistoryOrder>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}
