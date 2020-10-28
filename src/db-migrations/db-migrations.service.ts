import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MapDistanceEntity } from '../geocoder/entities/map-distance.entity';
import { Connection, Repository } from 'typeorm';
import { ZipcodesDistanceAssocEntity } from '../geocoder/entities/zipcodes-distance-assoc.entity';
import { ZipcodeEntity } from '../geocoder/entities/zipcode.entity';
import { RegionEntity } from '../geocoder/entities/region.entity';
import { ZipcodeListType, ZipcodesListEntity } from '../geocoder/entities/zipcodes-list.entity';
import { MerchantsZipcodeEntity } from '../geocoder/entities/merchants-zipcode.entity';
import { CustomersZipcodeEntity } from '../geocoder/entities/customers-zipcode.entity';
import { MerchantDepartmentEntity } from '../merchants/entities/merchant-department.entity';
import { ZipcodesService } from '../geocoder/services/zipcodes.service';
import { timer } from 'rxjs';
import { MerchantEntity } from '../merchants/entities/merchant.entity';

@Injectable()
export class DbMigrationsService {
  constructor(
    @InjectRepository(MapDistanceEntity)
    private readonly repositoryMP: Repository<MapDistanceEntity>,
    @InjectRepository(ZipcodesDistanceAssocEntity)
    private readonly repositoryZDA: Repository<ZipcodesDistanceAssocEntity>,
    @InjectRepository(ZipcodeEntity)
    protected readonly repositoryZipcodes: Repository<ZipcodeEntity>,
    @InjectRepository(RegionEntity)
    protected readonly repositoryRegions: Repository<RegionEntity>,
    @InjectRepository(ZipcodesListEntity)
    protected readonly repositoryZipcodesLists: Repository<ZipcodesListEntity>,
    @InjectRepository(MerchantsZipcodeEntity)
    protected readonly repositoryMerchants: Repository<MerchantsZipcodeEntity>,
    @InjectRepository(CustomersZipcodeEntity)
    protected readonly repositoryCustomers: Repository<CustomersZipcodeEntity>,
    @InjectRepository(MerchantDepartmentEntity)
    protected readonly repositoryDepartments: Repository<MerchantDepartmentEntity>,
    @InjectRepository(MerchantEntity)
    protected readonly repositoryMerchant: Repository<MerchantEntity>,
    private zipcodesService: ZipcodesService,
    private connection: Connection,
  ) {}

  async migrateMerchantMenuActive() {
    return this.repositoryMerchant
      .createQueryBuilder('merchant')
      .update()
      .set({
        menuActive: () => 'enableMenu',
      })
      .execute();
  }

  async migrateV1() {
    console.log('migrateV1 starting...');
    const regions = await this.repositoryRegions
      .find();
    const quebecRegion = regions.find(region => region.code === 'QC');
    const mapDistances = await this.repositoryMP
      .find();
    const zipcodesTmp: string[] = [];
    console.log('creating zipcodes');
    let zipcodes = mapDistances
      .reduce((res: ZipcodeEntity[], mp) => {
        if (zipcodesTmp.indexOf(mp.source) === -1) {
          zipcodesTmp.push(mp.source);
          const zipcode = new ZipcodeEntity({
            zipcode: mp.source,
            regionId: quebecRegion.id,
          });
          res.push(zipcode);
        }
        return res;
      }, []);
    // tslint:disable-next-line:forin
    for (const i in zipcodes) {
      try {
        const zipcode = zipcodes[i];
        // if (zipcode.zipcode !== 'H2P') {
        //   continue;
        // }
        console.log('zipcode :: ', zipcode.zipcode);
        const coords = await this.zipcodesService
          .validateZipcode('Canada', 'QC', zipcode.zipcode);
        await timer(500).toPromise();
        zipcode.latitude = coords.latitude;
        zipcode.longitude = coords.longitude;
      } catch (e) {
        console.log('ERROR 1 :: ', zipcodes[i].zipcode, e);
      }
    }
    // return { here: true };
    zipcodes = await this.repositoryZipcodes
      .save(zipcodes);
    const zipcodesAssoc = zipcodes.reduce((res: { [key: string]: ZipcodeEntity}, zipcode: ZipcodeEntity) => {
      res[zipcode.zipcode] = zipcode;
      return res;
    }, {});
    console.log('creating zipcode distance assocs');
    const zdas: ZipcodesDistanceAssocEntity[] = mapDistances.map(mp => {
      const zda = new ZipcodesDistanceAssocEntity({
        source: zipcodesAssoc[mp.source].id,
        destination: zipcodesAssoc[mp.destination].id,
        distance: mp.distance * 1000,
        duration: mp.duration * 60,
      });
      return zda;
    });
    await this.repositoryZDA
      .save(zdas);
    console.log('creating zipcodes lists');
    const customerZipcodes = await this.repositoryCustomers
      .find();
    const customerZipcodesList = new ZipcodesListEntity({
      type: ZipcodeListType.Customers,
      zipcodes: customerZipcodes.map(cz => zipcodesAssoc[cz.zipcode]),
    });
    await this.repositoryZipcodesLists
      .save(customerZipcodesList);
    const merchantsZipcodes = await this.repositoryMerchants
      .find();
    const merchantZipcodesList = new ZipcodesListEntity({
      type: ZipcodeListType.Merchants,
      zipcodes: merchantsZipcodes.map(cz => zipcodesAssoc[cz.zipcode]),
    });
    await this.repositoryZipcodesLists
      .save(merchantZipcodesList);
    console.log('updating merchants departments');
    const departments = await this.repositoryDepartments
      .find();
    await this.repositoryDepartments
      .save(
        departments.map(department => {
          // department.zipcodeEntityId = zipcodesAssoc[department.zipcode];
          department.zipcodeEntityId = zipcodesAssoc[department.zipcode].id;
          return department;
        }),
      );
    const manager = this.connection
      .createEntityManager();
    const keys = await manager.query('SHOW INDEX IN merchant_department_entity WHERE Column_name = \'zipcode\';');
    const key = keys[0].Key_name;
    try {
      await manager.query('ALTER TABLE `merchant_department_entity` DROP FOREIGN KEY `' + key + '`;');
    } finally {
      await manager.query('DROP INDEX `' + key + '` ON `merchant_department_entity`;');
    }
    return { success: true };
  }
}
