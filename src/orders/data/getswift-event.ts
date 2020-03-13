// $event['Data']['JobIdentifier']
// $event['Data']['Driver']['DriverName']
// $event['EventName'] : 'job/added' | 'job/accepted' | 'job/onway' | 'job/finished' | 'job/cancelled'

export interface GetswiftEvent {
  EventName: 'job/added' | 'job/accepted' | 'job/onway' | 'job/finished' | 'job/cancelled';
  Data: {
    JobIdentifier: string;
    Driver?: {
      DriverName: string;
    }
  };
}
