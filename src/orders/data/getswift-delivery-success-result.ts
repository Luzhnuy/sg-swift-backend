export enum GSDeliveryStatus {
  Cancelled = 'Cancelled',
  OnWay = 'PickedUp',
  Accepted = 'Accepted',
  Completed = 'Completed',
  Received = 'Received',
}

export class GetswiftDeliverySuccessResult {
  delivery: {
    id: string;
    reference: string;
    created: string;
    currentStatus: GSDeliveryStatus;
    estimatedDistance: {
      kilometres: string;
    },
    deliveryFee: string;
    trackingUrls: {
      www: string;
      api?: string;
    }
  };
}
