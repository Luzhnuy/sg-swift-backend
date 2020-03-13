import { Body, Controller, Param, Post } from '@nestjs/common';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { PaymentsStripeService } from '../services/payments-stripe.service';
import { PaymentsPayPalService } from '../services/payments-pay-pal.service';
import Stripe = require('stripe');
import IChargeCreationOptions = Stripe.charges.IChargeCreationOptions;

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsStripeService: PaymentsStripeService,
    private paymentsPayPalService: PaymentsPayPalService,
  ) {
  }

  @Post('paypal/cancel/:chargeId')
  async ppCancelPayment(@Body() data: any, @Param('chargeId') chargeId: string) {
    return this.paymentsPayPalService.proceedCharge(chargeId, data);
  }

  @Post('stripe/charge')
  async stripeCharge(@Body() data: IChargeCreationOptions, @User() user: UserEntity) {
    return this.paymentsStripeService.createCharge(data);
  }

}
