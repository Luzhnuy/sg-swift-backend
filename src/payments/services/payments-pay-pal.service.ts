import { HttpService, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { SettingsService } from '../../settings/services/settings.service';
import { SettingsVariablesKeys } from '../../settings/providers/settings-config';
import { Subject } from 'rxjs';

@Injectable()
export class PaymentsPayPalService {

  constructor(
    private readonly httpService: HttpService,
    private readonly settingsService: SettingsService,
  ) {}

  public async proceedCharge(chargeId: string, data?: {
    amount: {
      currency: 'CAD';
      total: string;
    };
    is_final_capture: boolean;
  }) {
    const token = await this.getTokenObj();
    let link: string;
    if (data && data.amount && data.amount.total && data.amount.total !== '0.00') {
      // link = `https://api.paypal.com/v1/payments/authorization/$id/capture`;
      link = `https://api.sandbox.paypal.com/v1/payments/authorization/${chargeId}/capture`;
    } else {
      data = null;
      // link =  `https://api.paypal.com/v1/payments/authorization/${chargeId}/void`;
      link =  `https://api.sandbox.paypal.com/v1/payments/authorization/${chargeId}/void`;
    }
    const subj = new Subject<null>();
    this.httpService
      .post<{ id: any }>(link,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${token.tokenType} ${token.accessToken}`,
          },
        })
      .subscribe(resp => {
        if (resp.data && resp.data.id) {
          subj.next();
          subj.complete();
        } else {
          subj.error(
            new UnprocessableEntityException(''),
          );
          subj.complete();
        }
      }, err => {
        subj.complete();
      });
    return subj.asObservable().toPromise();
  }

  private async getTokenObj() {
    const link = 'https://api.sandbox.paypal.com/v1/oauth2/token';
    // const link = 'https://api.paypal.com/v1/oauth2/token';
    const subj = new Subject<{
      accessToken: string,
      tokenType: string,
    }>();
    this.httpService
      .post<{
        access_token: string,
        token_type: string,
      }>(link,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          auth: {
            // method: 'Basic',
            username: this.settingsService.getValue(SettingsVariablesKeys.PayPalPublicKey),
            password: this.settingsService.getValue(SettingsVariablesKeys.PayPalSecret),
          },
        },
      )
      .subscribe(resp => {
        subj.next({
          accessToken: resp.data.access_token,
          tokenType: resp.data.token_type,
        });
        subj.complete();
      }, err => {
        subj.error(err);
        subj.complete();
      });

    return await subj.asObservable().toPromise();
  }

}
