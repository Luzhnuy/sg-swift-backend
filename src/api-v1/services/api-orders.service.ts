import { Injectable } from '@nestjs/common';
import { ErrorResponse, PrepareOrderData } from '../data/misc';

@Injectable()
export class ApiOrdersService {

  validate(data: PrepareOrderData): ErrorResponse | true {
    try {
      this.validateInformationFields(
        data.customerName,
        data.customerPhone,
        data.instructions,
      );
      const scheduledAt = new Date(data.scheduledAt);
      this.validateTime(scheduledAt);
      this.validateAddress(data.dropOffAddress);
      this.validatePaymentMethod();
    } catch (error) {
      return error as ErrorResponse;
    }
    return true;
  }

  private validateAddress(address: string) {
    return true;
  }

  private validateZone(zipcode: string) {
    return true;
  }

  private validateTime(scheduledAt: Date) {
    return true;
  }

  private validatePaymentMethod() {
    return true;
  }

  private validateCard() {
    return true;
  }

  private validateInformationFields(
    name: string,
    phone: string,
    instructions: string,
  ) {
    return true;
  }
}
