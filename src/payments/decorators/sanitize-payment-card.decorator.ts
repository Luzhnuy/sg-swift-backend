import { PaymentCardEntity } from '../entities/payment-card.entity';

export const SanitizePaymentCard = (cardField?: string) => {
  return (target, decoratedFnName: string, descriptor: PropertyDescriptor) => {
    const decoratedFn = descriptor.value;
    async function newFunction() {
      const data: any = await decoratedFn.apply(this, arguments);
      const card: PaymentCardEntity = cardField ? data[cardField] : data;
      if (card) {
        card.customerId = null;
        delete card.customerId;
        card.cardId = null;
        delete card.cardId;
      }
      return data;
    }

    return {
      value: newFunction,
    };
  };
}

export const SanitizePaymentCards = (cardField?: string) => {
  return (target, decoratedFnName: string, descriptor: PropertyDescriptor) => {
    const decoratedFn = descriptor.value;
    async function newFunction() {
      const entities: any[] = await decoratedFn.apply(this, arguments);
      return entities.map(entity => {
        const card: PaymentCardEntity = cardField ? entity[cardField] : entity;
        if (card) {
          card.customerId = null;
          delete card.customerId;
          card.cardId = null;
          delete card.cardId;
        }
        return entity;
      });
    }

    return {
      value: newFunction,
    };
  };
}
