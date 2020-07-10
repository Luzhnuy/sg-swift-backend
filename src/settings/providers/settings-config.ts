import { Injectable } from '@nestjs/common';
import { PermissionEntity } from '../../cms/roles-and-permissions/entities/permission.entity';
import { SettingsEntity } from '../entities/settings.entity';
import { SettingsService } from '../services/settings.service';

export enum SettingsPermissionKeys {
  AllowViewSettingsVariables = 'SettingsAllowViewSettingsVariables',
  AllowEditSettingsVariables = 'SettingsAllowEditSettingsVariables',
}

export enum SettingsVariablesKeys {
  SupportEmail = 'Support Email',
  PhpApiUrl = 'PHP api url',
  StripeKey = 'Stripe Key',
  SendGridKey = 'SendGrid Key',
  OneSignalSnapGrabId = 'OneSignal Snap Grab Id',
  OneSignalSnapGrabKey = 'OneSignal Snap Grab Key',
  OneSignalSnapGrabSwiftId = 'OneSignal Snap Grab Swift Id',
  OneSignalSnapGrabSwiftKey = 'OneSignal Snap Grab Swift Key',
  OneSignalSnapGrabMerchantId = 'OneSignal Snap Grab Merchant Id',
  OneSignalSnapGrabMerchantKey = 'OneSignal Snap Grab Merchant Key',
  DriversImagesHost = 'Images Host Address',
  TrackOrderWeb = 'Track Order Url',
  TwilioSid = 'Twilio SID',
  TwilioKey = 'Twilio Key',
  SMSPhone = 'SMS Phone Number',
  SMSSignUpMerchantText = 'Merchant Sign-up SMS text',
  SMSSignUpCustomerText = 'Customer Sign-up SMS text',
  GoogleMapsApiKey = 'Google Maps Api Key',
  PayPalPublicKey = 'PayPal public key',
  PayPalSecret = 'PayPal secret',
  Environment = 'Environment',
}

@Injectable()
export class SettingsConfig {

  public readonly MODULE_GROUP = 'Settings';

  public readonly MODULE_PERMISSIONS = [
    new PermissionEntity({
      key: SettingsPermissionKeys.AllowViewSettingsVariables,
      description: 'Allow to view list of settings variables',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: SettingsPermissionKeys.AllowEditSettingsVariables,
      description: 'Allow to edit and delete settings variables',
      group: this.MODULE_GROUP,
    }),
  ];

  public readonly MODULE_CONTENTS = [];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  private settings: SettingsEntity[] = [
    new SettingsEntity({
      key: SettingsVariablesKeys.SupportEmail,
      value: 'support@snapgrabdelivery.com',
      comment: 'Email which uses as sender',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.PhpApiUrl,
      value: 'http://search.snapgrabdelivery.com',
      comment: 'Base url for Webhooks',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.StripeKey,
      value: '',
      comment: 'Stripe Secret Key',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.SendGridKey,
      value: '',
      comment: 'Sendgrid Api Key',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.OneSignalSnapGrabId,
      value: '',
      comment: 'OneSignal Api Id for customer app',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.OneSignalSnapGrabKey,
      value: '',
      comment: 'OneSignal Rest Api Key for customer app',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.OneSignalSnapGrabSwiftId,
      value: '',
      comment: 'OneSignal Api Id for drivers app',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.OneSignalSnapGrabSwiftKey,
      value: '',
      comment: 'OneSignal Rest Api Key for drivers app',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.OneSignalSnapGrabMerchantId,
      value: '',
      comment: 'OneSignal Api Id for merchant portal',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.OneSignalSnapGrabMerchantKey,
      value: '',
      comment: 'OneSignal Rest Api Key for merchant portal',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.DriversImagesHost,
      value: '',
      comment: 'Host for drivers image (for emails)',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.TrackOrderWeb,
      value: '',
      comment: 'Url for tracking order in web (for old customer apps). Order Key will be added as the last path param',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.TwilioSid,
      value: '',
      comment: 'This is normally account sid, but if using key/secret auth will be the api key sid.',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.TwilioKey,
      value: '',
      comment: 'This is normally auth token, but if using key/secret auth will be the secret.',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.SMSPhone,
      value: '+15146128280',
      comment: 'Sender phone Number.',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.SMSSignUpMerchantText,
      value: 'Verification code for SnapGrab : __code__',
      comment: 'SMS verification code for Merchants. Variables: __code__',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.SMSSignUpCustomerText,
      value: 'Verification code for SnapGrab : __code__',
      comment: 'SMS verification code for SnapGrab users. Variables: __code__',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.GoogleMapsApiKey,
      value: '',
      comment: 'Google Maps api key',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.PayPalPublicKey,
      value: '',
      comment: 'PayPal public key',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.PayPalSecret,
      value: '',
      comment: 'PayPal secret',
      isDefault: true,
    }),
    new SettingsEntity({
      key: SettingsVariablesKeys.Environment,
      value: '',
      comment: 'Environment',
      isDefault: true,
    }),
  ];

  constructor(
    private settingsService: SettingsService,
  ) {
    this.settingsService.$loaded.subscribe(() => {
      this.init();
    });
  }

  private async init() {
    this.settingsService
      .init(this.settings);
  }

}
