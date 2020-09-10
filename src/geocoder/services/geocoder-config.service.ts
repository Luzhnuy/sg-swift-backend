import { Injectable } from '@nestjs/common';
import { PermissionEntity } from '../../cms/roles-and-permissions/entities/permission.entity';
import { ContentPermissionHelper } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { RolesAndPermissionsModuleConfig } from '../../cms/roles-and-permissions/misc/roles-and-permissions-module-config';
import { RegionEntity } from '../entities/region.entity';
import { RegionsService } from './regions.service';

export enum GeocoderPermissionKeys {
  ViewZipcodes = 'GeocoderViewZipcodes',
  AddEditZipcode = 'GeocoderAddEditZipcode',
  RemoveZipcode = 'GeocoderRemoveZipcode',
  ViewZipcodesLists = 'GeocoderViewZipcodesLists',
  AddZipcodeToList = 'GeocoderAddZipcodeToList',
  RemoveZipcodeFromList = 'GeocoderRemoveZipcodeFromList',
}

@Injectable()
export class GeocoderConfigService extends RolesAndPermissionsModuleConfig {

  public readonly MODULE_GROUP = 'Geocoder';

  public readonly MODULE_ROLES = [];

  public readonly MODULE_PERMISSIONS = [
    new PermissionEntity({
      key: GeocoderPermissionKeys.ViewZipcodes,
      description: 'View all available zipcodes',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: GeocoderPermissionKeys.AddEditZipcode,
      description: 'Add/Edit new zipcode',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: GeocoderPermissionKeys.RemoveZipcode,
      description: 'Remove zipcode',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: GeocoderPermissionKeys.AddZipcodeToList,
      description: 'Add zipcode to lists',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: GeocoderPermissionKeys.ViewZipcodesLists,
      description: 'View zipcodes lists',
      group: this.MODULE_GROUP,
    }),
    new PermissionEntity({
      key: GeocoderPermissionKeys.RemoveZipcodeFromList,
      description: 'Remove zipcode from lists',
      group: this.MODULE_GROUP,
    }),
  ];

  public readonly MODULE_CONTENTS = [];

  public readonly MODULE_DEFAULT_PERMISSION_ROLES = {};

  private regions: RegionEntity[] = [
    new RegionEntity({
      countryCode: 'CA',
      code: 'QC',
      name: 'Quebec',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'AB',
      name: 'Alberta',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'BC',
      name: 'British Columbia',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'MB',
      name: 'Manitoba',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'NB',
      name: 'New Brunswick',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'NL',
      name: 'Newfoundland and Labrador',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'NT',
      name: 'Northwest Territories',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'NC',
      name: 'Nova Scotia',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'NU',
      name: 'Nunavut',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'ON',
      name: 'Ontario',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'PE',
      name: 'Prince Edward Island',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'SK',
      name: 'Saskatchewan',
    }),
    new RegionEntity({
      countryCode: 'CA',
      code: 'YT',
      name: 'Yukon',
    }),
  ];

  constructor(
    protected contentPermissionHelper: ContentPermissionHelper,
    protected regionsService: RegionsService,
  ) {
    super(contentPermissionHelper);
    this.init();
    // this.addDefPerRole(ContentPermissionsKeys.ContentViewAll, RegionEntity.name, RolesAndPermissionsRolesName.Admin);
    // this.addDefPerRoleShort(GeocoderPermissionKeys.AddZipcodeToList, RolesAndPermissionsRolesName.Admin);
  }

  init() {
    setTimeout(() => {
      this.regions
        .forEach(region => {
          this.regionsService
            .addIfNotExists(region.code, region.name, region.countryCode);
        });
    }, 2000);
  }

}
