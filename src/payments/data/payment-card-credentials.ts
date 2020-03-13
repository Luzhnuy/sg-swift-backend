export class PaymentCardCredentials {
  name: string;
  number: number;
  month: number;
  year: number;
  cvc: string;
  object: 'card' = 'card';
  userId?: number;

  constructor(data?: Partial<PaymentCardCredentials>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
