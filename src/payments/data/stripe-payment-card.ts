export class StripePaymentCard {
  source: {
    name: string;
    number: number;
    exp_month: string;
    exp_year: string;
    cvc: string;
    object: 'card';
  };
  description: string;
  email: string;
}
