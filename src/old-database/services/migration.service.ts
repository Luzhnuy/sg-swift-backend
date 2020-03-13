import { HttpService, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Accounts } from '../entities/Accounts';
import { Repository } from 'typeorm';
import { Categories } from '../entities/Categories';
import { EmailSubscriptions } from '../entities/EmailSubscriptions';
import { Historyorders } from '../entities/Historyorders';
import { Menus } from '../entities/Menus';
import { OrdersInfo } from '../entities/OrdersInfo';
import { Stripecustomers } from '../entities/Stripecustomers';
import { Users } from '../entities/Users';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { MerchantsRolesName } from '../../merchants/services/merchants-config.service';
import { UsersService } from '../../cms/users/services/users.service';
import { MerchantEntity } from '../../merchants/entities/merchant.entity';
import { MenuCategoryEntity } from '../../merchants/entities/menu-category.entity';
import { MenuItemEntity } from '../../merchants/entities/menu-item.entity';
import { SettingsService } from '../../settings/services/settings.service';
import * as fs from 'fs';
import { timer } from 'rxjs';
import { MerchantDepartmentEntity } from '../../merchants/entities/merchant-department.entity';
import { GeocoderService } from '../../geocoder/services/geocoder.service';
import { PaymentCardEntity } from '../../payments/entities/payment-card.entity';
import { CustomersRolesName } from '../../customers/providers/customers-config';
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { CustomerMetadataEntity } from '../../customers/entities/customer-metadata.entity';
import { CustomerDeviceInfoEntity } from '../../customers/entities/customer-device-info.entity';
import { OrderEntity, OrderSource, OrderStatus, OrderType } from '../../orders/entities/order.entity';
import { OrderMetadataEntity, PaymentMethods } from '../../orders/entities/order-metadata.entity';
import { HistoryOrderPaymentMethods } from '../../orders/data/history-order';
import { OrderItemEntity } from '../../orders/entities/order-item.entity';

@Injectable()
export class MigrationService {

  private processing = false;

  constructor(
    @InjectRepository(Accounts, 'oldDatabaseConn') protected readonly repAccounts: Repository<Accounts>,
    @InjectRepository(Categories, 'oldDatabaseConn') protected readonly repCategories: Repository<Categories>,
    @InjectRepository(EmailSubscriptions, 'oldDatabaseConn') protected readonly repEmailSubscriptions: Repository<EmailSubscriptions>,
    @InjectRepository(Historyorders, 'oldDatabaseConn') protected readonly repHistoryorders: Repository<Historyorders>,
    @InjectRepository(Menus, 'oldDatabaseConn') protected readonly repMenus: Repository<Menus>,
    @InjectRepository(OrdersInfo, 'oldDatabaseConn') protected readonly repOrdersInfo: Repository<OrdersInfo>,
    @InjectRepository(Stripecustomers, 'oldDatabaseConn') protected readonly repStripecustomers: Repository<Stripecustomers>,
    @InjectRepository(Users, 'oldDatabaseConn') protected readonly repUsers: Repository<Users>,

    @InjectRepository(UserEntity) protected readonly repUserEntity: Repository<UserEntity>,
    @InjectRepository(MerchantEntity) protected readonly repMerchantEntity: Repository<MerchantEntity>,
    @InjectRepository(MenuCategoryEntity) protected readonly repMenuCategoryEntity: Repository<MenuCategoryEntity>,
    @InjectRepository(MenuItemEntity) protected readonly repMenuItemEntity: Repository<MenuItemEntity>,
    @InjectRepository(MerchantDepartmentEntity) protected readonly repDepartmentEntity: Repository<MerchantDepartmentEntity>,
    @InjectRepository(PaymentCardEntity) protected readonly repPaymentCardEntity: Repository<PaymentCardEntity>,
    @InjectRepository(CustomerEntity) protected readonly repCustomerEntity: Repository<CustomerEntity>,
    @InjectRepository(CustomerMetadataEntity) protected readonly repCustomerMetadataEntity: Repository<CustomerMetadataEntity>,
    @InjectRepository(CustomerDeviceInfoEntity) protected readonly repCustomerDeviceInfoEntity: Repository<CustomerDeviceInfoEntity>,
    @InjectRepository(OrderMetadataEntity) protected readonly repOrderMetadataEntity: Repository<OrderMetadataEntity>,
    @InjectRepository(OrderEntity) protected readonly repOrderEntity: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity) protected readonly repOrderItemEntity: Repository<OrderItemEntity>,

    private usersService: UsersService,
    private settingsService: SettingsService,
    private httpService: HttpService,
    private geocoderService: GeocoderService,
  ) {}

  async migrate() {
    console.log('migrate = ', !this.processing);
    if (!this.processing) {
      setTimeout(async () => {
        this.processing = true;
        try {
          await this.migrateMerchants();
          await this.migrateCustomers();
          await this.migrateOrders();
        } finally {
          this.processing = false;
        }
      }, 10);
    }
    return { processing: this.processing };
  }

  private async migrateMerchants() {
    const limit = 20;
    const count = await this.repUsers
      .createQueryBuilder('users')
      .innerJoin('accounts', 'accounts', 'users.id = accounts.id')
      .getCount();
    console.log('MERCHANTS COUNT = ', count);
    let usersCount = 0;
    const migratePortion = async (iteration: number) => {
      const builder = this.repUsers
        .createQueryBuilder('users')
        .innerJoin('accounts', 'accounts', 'users.id = accounts.id')
        .skip(limit * iteration)
        .take(limit)
        .orderBy('users.id', 'ASC');
      const newUsers = await builder.getMany();
      for (const user of newUsers) {
        try {
          await this.migrateMerchant(user);
        } catch (e) {
          console.log('Merchant Migration FAILURE !!! :: ', user.id, e);
        }
      }
      usersCount += newUsers.length;
      if (usersCount < count) {
        return await migratePortion(++iteration);
      }
      return;
    };
    return await migratePortion(0);
  }

  private async migrateMerchant(user: Users) {
    console.log('migrateMerchant', user.id);
    const account: Accounts = await this.repAccounts.findOne(user.id);
    let userEntity: UserEntity = new UserEntity({
      username: this.decorateEmail(user.username),
      password: user.password,
      isActive: true,
      useSha1: true,
      solt: 'aDYhG93b0qyJfIxfs2guVoUubWwvniR2G0FgaC9mi',
      createdAt: user.created,
      roles: [],
    });
    await this.usersService.addRoleIfAbsent(userEntity, MerchantsRolesName.Merchant);
    userEntity = await this.usersService.createUser(userEntity, false, true);

    let merchantEntity = new MerchantEntity({
      userId: userEntity.id,
      name: account.name,
      reference: this.decorateRef(user.clientkey),
      description: account.description,
      website: account.website ?
        (/^https?:\/\/.+/.test(account.website) ?
          account.website :
          'http://' + account.website) : null,
      phone: account.phone,
      email: this.getMarketingEmail(user),
      enableBooking: !!account.enabled,
      enableMenu: !!account.enabledmenu,
      isPublished: !account.deleted,
      subscribedOnReceipt: false,
      isWaiting: false,
    });

    merchantEntity = await this.repMerchantEntity.save(merchantEntity);
    const categories = await this.repCategories
      .find({
        userid: user.id,
      });
    let isWaiting = false;

    for (const category of categories) {
      let categoryEntity = new MenuCategoryEntity({
        merchantId: merchantEntity.id,
        name: category.nameeng,
        description: category.shortdescriptioneng,
      });
      categoryEntity = await this.repMenuCategoryEntity
        .save(categoryEntity);
      const items = await this.repMenus
        .find({
          category: category.id.toString(),
        });
      for (const item of items) {
        let itemEntity: MenuItemEntity = new MenuItemEntity({
          categoryId: categoryEntity.id,
          merchantId: merchantEntity.id,
          name: item.nameeng,
          description: item.shortdescriptioneng,
          price: parseFloat(item.price),
          isWaiting: !!item.disabled,
          isPublished: !!item.enabled,
        });
        isWaiting = isWaiting || !!item.disabled;
        itemEntity = await this.repMenuItemEntity.save(itemEntity);
        if (item.image) {
          try {
            const url = await this.copyImage(
              `files/menu/image/${item.id}/${item.image}`,
              itemEntity.id, 'menu');
            itemEntity.image = url;
          } catch (e) {
            console.log('IMAGE MENU ITEM NOT AVAILABLE :: ', `files/menu/image/${item.id}/${item.image}`);
            if (itemEntity.isPublished) {
              itemEntity.isPublished = false;
            }
          }
          await this.repMenuItemEntity.save(itemEntity);
        }
      }
    }
    let changed = false;
    if (isWaiting) {
      merchantEntity.isWaiting = true;
      changed = true;
    }
    if (account.logo && account.logo !== 'NNIMG') {
      try {
        const url = await this.copyImage(
          `files/account/logo/${account.id}/${account.logo}`,
          merchantEntity.id, 'merchant');
        merchantEntity.logo = url;
      } catch (e) {
        console.log('image not available :: ', `files/account/logo/${account.id}/${account.logo}`);
        if (merchantEntity.enableMenu) {
          merchantEntity.enableMenu = false;
        }
      } finally {
        changed = true;
      }
    } else if (account.enabledmenu) {
      console.log('IMAGE NOT FOUND (MERCHANT DISABLED BECAUSE MENU WAS ENABLED):: ', account.id);
      merchantEntity.enableMenu = false;
      changed = true;
    }
    const subscr = await this.repEmailSubscriptions.findOne({
      userid: user.id,
    });
    if (subscr && !!subscr.receipts) {
      merchantEntity.subscribedOnReceipt = true;
      changed = true;
    }
    let addressStr = account.address;
    if (account.city && !addressStr.includes(account.city)) {
      addressStr += ', ' + account.city;
    }
    const departmentEntity: MerchantDepartmentEntity = new MerchantDepartmentEntity({
      merchantId: merchantEntity.id,
      isMain: true,
      openHours: 600,
      closeHours: 1320,
      address: account.address,
    });
    const addr = await this.geocoderService.getGeocodeAddress(addressStr);
    if (addr) {
      const tmr = timer(2000);
      await tmr.toPromise();
      const geoCodeZipCode = this.geocoderService.getShortZipcode(addr);
      if (!geoCodeZipCode) {
        console.log('GEOCOCDE not found', account.id, addressStr, addr);
      }
      const accZipCode = account.zipcode ? account.zipcode.trim().substr(0, 3) : account.zipcode;
      if (
        geoCodeZipCode
        && (!accZipCode || accZipCode === geoCodeZipCode)
      ) {
        if (!accZipCode) {
          const placeAddr = await this.geocoderService.getAddress(addressStr);
          if (!placeAddr ||
            this.geocoderService.getShortZipcode(placeAddr) !== geoCodeZipCode
          ) {
            console.warn('Place not found OR Place and Geocode are different');
            console.log(account.id, geoCodeZipCode, placeAddr ? this.geocoderService.getShortZipcode(placeAddr) : false);
          }
          if (account.enabledmenu) {
            merchantEntity.enableMenu = false;
            changed = true;
          }
        }
        departmentEntity.zipcode = geoCodeZipCode;
        departmentEntity.countryCode = this.geocoderService.getCountryCode(addr);
        departmentEntity.country = this.geocoderService.getCountry(addr);
        departmentEntity.region = this.geocoderService.getRegion(addr);
        departmentEntity.city = this.geocoderService.getCity(addr);
        departmentEntity.building = this.geocoderService.getStreetNumber(addr);
        departmentEntity.latitude = addr.geometry.location.lat;
        departmentEntity.longitude = addr.geometry.location.lng;
      } else if (account.enabledmenu || merchantEntity.enableBooking) {
        console.log('MENU AND BOOKING CHANGED TO DISABLED 1', account.id, geoCodeZipCode, accZipCode);
        merchantEntity.enableMenu = false;
        merchantEntity.enableBooking = false;
        changed = true;
      } else {
        console.log('ADDRESS WASN\'T SAVED FOR DISABLED MERCHANT 1', account.id, geoCodeZipCode, accZipCode);
      }
    }
    if (changed) {
      await this.repMerchantEntity.save(merchantEntity);
    }
    try {
      await this.repDepartmentEntity.save(departmentEntity);
    } catch (e) {
      console.log('DEPARTMENT WASN\'T SAVED', account.id);
      departmentEntity.zipcode = null;
      departmentEntity.countryCode = null;
      departmentEntity.country = null;
      departmentEntity.region = null;
      departmentEntity.city = null;
      departmentEntity.building = null;
      departmentEntity.latitude = null;
      departmentEntity.longitude = null;
      await this.repDepartmentEntity.save(departmentEntity);
      if (account.enabledmenu || merchantEntity.enableBooking) {
        console.log('MENU AND BOOKING CHANGED TO DISABLED 2', account.id);
        merchantEntity.enableMenu = false;
        merchantEntity.enableBooking = false;
        await this.repMerchantEntity.save(merchantEntity);
      } else {
        console.log('ADDRESS WASN\'T SAVED FOR DISABLED MERCHANT 2', account.id, account.zipcode);
      }
    }
    await this.migrateCard(user, merchantEntity.userId);
  }

  private async migrateCustomers() {
    const limit = 20;
    const count = await this.repUsers
      .createQueryBuilder('users')
      .leftJoin('accounts', 'accounts', 'users.id = accounts.id')
      .where('accounts.id IS NULL')
      .getCount();
    console.log('CUSTOMERS COUNT = ', count);
    let usersCount = 0;
    const migratePortion = async (iteration: number) => {
      const builder = this.repUsers
        .createQueryBuilder('users')
        .leftJoin('accounts', 'accounts', 'users.id = accounts.id')
        .where('accounts.id IS NULL')
        .skip(limit * iteration)
        .take(limit)
        .orderBy('users.id', 'ASC');
      const newUsers = await builder.getMany();
      for (const user of newUsers) {
        await this.migrateCustomer(user);
      }
      usersCount += newUsers.length;
      if (usersCount < count) {
        return await migratePortion(++iteration);
      }
      return;
    };
    return await migratePortion(0);
  }

  private async migrateCustomer(user: Users) {
    console.log('migrateCustomer', user.id);
    if (user.lastname && user.lastname.length > 32) {
      user.lastname = user.lastname.slice(0, 5);
    }
    let userEntity: UserEntity = new UserEntity({
      username: this.decorateEmail(user.username),
      password: user.password,
      isActive: true,
      useSha1: true,
      solt: 'aDYhG93b0qyJfIxfs2guVoUubWwvniR2G0FgaC9mi',
      createdAt: user.created,
      roles: [],
    });
    await this.usersService.addRoleIfAbsent(userEntity, CustomersRolesName.Customer);
    userEntity = await this.usersService.createUser(userEntity, false, true);

    let customerEntity = new CustomerEntity({
      userId: userEntity.id,
      phone: user.phone,
      email: this.getMarketingEmail(user),
      isPublished: true,
      clientId: this.decorateClientId(user.id),
      firstName: user.firstname,
      lastName: user.lastname,
    });
    customerEntity = await this.repCustomerEntity.save(customerEntity);

    let refCustomer: CustomerEntity;
    if (user.refUserId) {
      refCustomer = await this.repCustomerEntity.findOne({
        clientId: this.decorateClientId(user.refUserId),
      });
    }
    const metadata = new CustomerMetadataEntity({
      customerId: customerEntity.id,
      refUserId: refCustomer ? refCustomer.userId : null,
      refPaid: user.refPaid,
      credit: user.credit,
      debtAmount: 0,
      isFacebook: this.isFacebook(user.username),
      appVersion: user.appversion || '1.0',
    });
    await this.repCustomerMetadataEntity.save(metadata);

    const deviceInfo = new CustomerDeviceInfoEntity({
      customerId: customerEntity.id,
      manufacturer: user.devicemanufacturer,
      model: user.devicemodel,
      platform: user.deviceplatform,
      version: user.deviceversion,
      uuid: user.deviceuuid,
    });
    await this.repCustomerDeviceInfoEntity.save(deviceInfo);

    await this.migrateCard(user, customerEntity.userId);
  }

  private async migrateOrders() {
    const limit = 20;
    const count = await this.repOrdersInfo
      .createQueryBuilder('orders')
      .where('orders.created > DATE_SUB(CURDATE(), INTERVAL 6 MONTH)')
      .getCount();
    console.log('ORDERS COUNT = ', count);
    let ordersCount = 0;
    const migratePortion = async (iteration: number) => {
      const builder = this.repOrdersInfo
        .createQueryBuilder('orders')
        .where('orders.created > DATE_SUB(CURDATE(), INTERVAL 6 MONTH)')
        .skip(limit * iteration)
        .take(limit)
        .orderBy('orders.id', 'ASC');
      const newOrders = await builder.getMany();
      for (const order of newOrders) {
        try {
          await this.migrateOrder(order);
        } catch (e) {
          console.log('Order Migration FAILURE !!! :: ', e);
        }
      }
      ordersCount += newOrders.length;
      if (ordersCount < count) {
        return await migratePortion(++iteration);
      }
      return;
    };
    return await migratePortion(0);
  }

  async migrateOrder(order: OrdersInfo) {
    console.log('migrateOrder', order.id);
    const historyOrder = await this.repHistoryorders.findOne({
      jobid: order.getswiftid,
    });
    const orderType: OrderType = !historyOrder ? OrderType.Booking :
      (historyOrder.type === 'custom' ? OrderType.Custom : OrderType.Menu);
    let merchantEntity: MerchantEntity;
    let customerEntity: CustomerEntity;
    if ([OrderType.Menu, OrderType.Booking].indexOf(orderType) > -1) {
      merchantEntity = await this.repMerchantEntity.findOne({
        reference: this.decorateRef(order.reference),
      });
      if (!merchantEntity) {
        console.log('NO MERCHANT', order.getswiftid);
        return;
      }
    }
    if (historyOrder && [OrderType.Menu, OrderType.Custom].indexOf(orderType) > -1) {
      customerEntity = await this.repCustomerEntity.findOne({
        clientId: this.decorateClientId(historyOrder.userid),
      });
      if (!customerEntity) {
        console.log('NO CUSTOMER', order.getswiftid);
        return;
      }
    }

    let metadataEntity = new OrderMetadataEntity({
      distance: order.distance ? (order.distance < 100 ? order.distance * 1000 : order.distance) : null,
      description: orderType === OrderType.Booking ? order.instructions : historyOrder.description,
      largeOrder: !!order.largeorder,
      bringBack: !!order.bringback,
      deliveryCharge: order.deliveryfee,
      subtotal: historyOrder ? (historyOrder.subtotal ? parseFloat(historyOrder.subtotal) : null) : null,
      serviceFee: historyOrder ? (historyOrder.servicefee ? parseFloat(historyOrder.servicefee) : null) : null,
      tps: historyOrder ? (historyOrder.tax ? (parseFloat(historyOrder.tax) / 3) : null) : null,
      tvq: historyOrder ? (historyOrder.tax ? (parseFloat(historyOrder.tax) / 1.5) : null) : null,
      tip: historyOrder ? (historyOrder.tip && historyOrder.tipsign === '$' ? parseFloat(historyOrder.tip) : 0) : 0,
      tipPercent: historyOrder ? (historyOrder.tipsign === '%' ? parseFloat(historyOrder.tip) : 0) : 0,
      customAmount: null,
      totalAmount: historyOrder ? (historyOrder.totalAmount ? parseFloat(historyOrder.totalAmount) : null) : null,
      chargedAmount: historyOrder ? (historyOrder.amount && historyOrder.amount !== 'TBD' ?
        parseInt(historyOrder.amount, 10) : null) : null,
      debtAmount: 0,
      reference: merchantEntity ? merchantEntity.reference : null,
      chargeId: historyOrder ? historyOrder.chargeid : null,
      deliveryInstructions: '',
      promoCode: historyOrder ? historyOrder.promocode : null,
      discount: 0,
      paymentMethod: historyOrder ?
        ((historyOrder.paymentmethod ? historyOrder.paymentmethod : HistoryOrderPaymentMethods.Stripe) as PaymentMethods)
        : null,
      clientId: customerEntity ? customerEntity.clientId.toString() : null,
      cancellationReason: null,
      utcOffset: -300,
      lastFour: historyOrder ? historyOrder.last4 : null,
      scheduledTime: 0,
      pickUpAddress: order.pickupaddress,
      pickUpTitle: order.pickupname,
      pickUpPhone: order.pickupphone,
      dropOffAddress: order.dropoffaddress,
      dropOffTitle: order.dropoffname,
      dropOffPhone: order.dropoffphone,
      pickUpLat: null,
      pickUpLon: null,
      dropOffLat: null,
      dropOffLon: null,
      pickUpEmail: null,
      dropOffEmail: null,
    });
    metadataEntity = await this.repOrderMetadataEntity
      .save(metadataEntity);
    let orderEntity = new OrderEntity({
      uuid: this.decorateOrderUuid(order.getswiftid),
      metadataId: metadataEntity.id,
      merchantId: merchantEntity ? merchantEntity.id : null,
      customerId: customerEntity ? customerEntity.id : null,
      source: orderType === OrderType.Booking ? OrderSource.Merchant : OrderSource.CustomerOld,
      type: orderType,
      status: order.status === 'Received' ? OrderStatus.Received :
        order.status === 'Accepted' ? OrderStatus.Accepted :
        order.status === 'PickedUp' ? OrderStatus.OnWay :
        order.status === 'Completed' ? OrderStatus.Completed :
        OrderStatus.Cancelled,
      createdAt: order.created,
    });
    orderEntity = await this.repOrderEntity.save(orderEntity);
    if (order.items) {
      const items: Array<{
        sku: string,
        quantity: number,
        price: number,
        description: string,
      }> = this.unserialize(order.items);
      for (const item of items) {
        const orderItemEntity = new OrderItemEntity({
          orderId: orderEntity.id,
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
        });
        await this.repOrderItemEntity.save(orderItemEntity);
      }
    }
  }

  private async migrateCard(user: Users, userEntityId: number) {
    const card = await this.repStripecustomers.findOne({
      apiid: user.id.toString(),
    });
    if (card) {
      const cardEntity: PaymentCardEntity = new PaymentCardEntity({
        authorId: userEntityId,
        brand: card.brand,
        last4: card.last4,
        cardId: card.source,
        customerId: card.stripeid,
      });
      await this.repPaymentCardEntity.save(cardEntity);
    }
    return false;
  }

  private async copyImage(imageUrl: string, id: string | number, type: 'menu' | 'merchant'): Promise<string> {
    const baseUrl = 'https://admin.snapgrabdelivery.com';
    const ext = imageUrl.endsWith('.png') ? '.png' : '.jpg';
    const uploadPath = this.getFileName(id, ext, type);
    const writer = fs.createWriteStream(uploadPath);
    const response = await this.httpService.axiosRef({
      url: `${baseUrl}/${imageUrl}`,
      method: 'GET',
      responseType: 'stream',
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        resolve('/' + uploadPath);
      });
      writer.on('error', reject);
    });
  }

  private getFileName(id: number | string, ext: string, type: 'menu' | 'merchant') {
    let path: string;
    switch (type) {
      case 'menu':
        path = 'uploads/menu-items/image/menu-item-';
        break;
      case 'merchant':
        path = 'uploads/merchants/logo/merchant-';
        break;
    }
    const fileName = path + id + ext;
    return fileName;
  }

  private decorateEmail(email) {
    // return email;
    return 'sg_prod__' + email;
  }

  private decorateClientId(clientId: string | number) {
    // return clientId;
    clientId = parseInt(clientId.toString(), 10);
    clientId += 999;
    return clientId;
  }

  private decorateRef(ref: string) {
    // return ref;
    return `prod-${ref}`;
  }

  private decorateOrderUuid(uuid) {
    // return uuid;
    uuid = uuid.substr(5);
    return `prod-${uuid}`;
  }

  private getMarketingEmail(user: Users) {
    if (user.marketingEmail && this.isFacebook(user.marketingEmail)) {
      user.marketingEmail = null;
    }
    if (user.marketingEmail) {
      return this.decorateEmail(user.marketingEmail);
    }
    if (this.isFacebook(user.username)) {
      return null;
    } else {
      return this.decorateEmail(user.username);
    }
  }

  private isFacebook(username: string) {
    return username.endsWith('@facebook.com');
  }

  private unserialize(data) {
    var utf8Overhead = function (str) {
      var s = str.length
      for (var i = str.length - 1; i >= 0; i--) {
        var code = str.charCodeAt(i)
        if (code > 0x7f && code <= 0x7ff) {
          s++
        } else if (code > 0x7ff && code <= 0xffff) {
          s += 2
        }
        // trail surrogate
        if (code >= 0xDC00 && code <= 0xDFFF) {
          i--
        }
      }
      return s - 1
    }
    var readUntil = function (data, offset, stopchr) {
      var i = 2
      var buf = []
      var chr = data.slice(offset, offset + 1)

      while (chr !== stopchr) {
        if ((i + offset) > data.length) {
          throw Error('Invalid')
        }
        buf.push(chr)
        chr = data.slice(offset + (i - 1), offset + i)
        i += 1
      }
      return [buf.length, buf.join('')]
    }
    var readChrs = function (data, offset, length) {
      var i, chr, buf

      buf = []
      for (i = 0; i < length; i++) {
        chr = data.slice(offset + (i - 1), offset + i)
        buf.push(chr)
        length -= utf8Overhead(chr)
      }
      return [buf.length, buf.join('')]
    }
    function _unserialize (data, offset) {
      var dtype
      var dataoffset
      var keyandchrs
      var keys
      var contig
      var length
      var array
      var obj
      var readdata
      var readData
      var ccount
      var stringlength
      var i
      var key
      var kprops
      var kchrs
      var vprops
      var vchrs
      var value
      var chrs = 0
      var typeconvert = function (x) {
        return x
      }

      if (!offset) {
        offset = 0
      }
      dtype = (data.slice(offset, offset + 1))

      dataoffset = offset + 2

      switch (dtype) {
        case 'i':
          typeconvert = function (x) {
            return parseInt(x, 10)
          }
          readData = readUntil(data, dataoffset, ';')
          chrs = readData[0]
          readdata = readData[1]
          dataoffset += chrs + 1
          break
        case 'b':
          typeconvert = function (x) {
            const value = parseInt(x, 10)

            switch (value) {
              case 0:
                return false
              case 1:
                return true
              default:
                throw SyntaxError('Invalid boolean value')
            }
          }
          readData = readUntil(data, dataoffset, ';')
          chrs = readData[0]
          readdata = readData[1]
          dataoffset += chrs + 1
          break
        case 'd':
          typeconvert = function (x) {
            return parseFloat(x)
          }
          readData = readUntil(data, dataoffset, ';')
          chrs = readData[0]
          readdata = readData[1]
          dataoffset += chrs + 1
          break
        case 'n':
          readdata = null
          break
        case 's':
          ccount = readUntil(data, dataoffset, ':')
          chrs = ccount[0]
          stringlength = ccount[1]
          dataoffset += chrs + 2

          readData = readChrs(data, dataoffset + 1, parseInt(stringlength, 10))
          chrs = readData[0]
          readdata = readData[1]
          dataoffset += chrs + 2
          if (chrs !== parseInt(stringlength, 10) && chrs !== readdata.length) {
            throw SyntaxError('String length mismatch')
          }
          break
        case 'a':
          readdata = {}

          keyandchrs = readUntil(data, dataoffset, ':')
          chrs = keyandchrs[0]
          keys = keyandchrs[1]
          dataoffset += chrs + 2

          length = parseInt(keys, 10)
          contig = true

          for (i = 0; i < length; i++) {
            kprops = _unserialize(data, dataoffset)
            kchrs = kprops[1]
            key = kprops[2]
            dataoffset += kchrs

            vprops = _unserialize(data, dataoffset)
            vchrs = vprops[1]
            value = vprops[2]
            dataoffset += vchrs

            if (key !== i) {
              contig = false
            }

            readdata[key] = value
          }

          if (contig) {
            array = new Array(length)
            for (i = 0; i < length; i++) {
              array[i] = readdata[i]
            }
            readdata = array
          }

          dataoffset += 1
          break
        case 'O': {
          // O:<class name length>:"class name":<prop count>:{<props and values>}
          // O:8:"stdClass":2:{s:3:"foo";s:3:"bar";s:3:"bar";s:3:"baz";}
          readData = readUntil(data, dataoffset, ':') // read class name length
          dataoffset += readData[0] + 1
          readData = readUntil(data, dataoffset, ':')

          if (readData[1] !== '"stdClass"') {
            throw Error('Unsupported object type: ' + readData[1])
          }

          dataoffset += readData[0] + 1 // skip ":"
          readData = readUntil(data, dataoffset, ':')
          keys = parseInt(readData[1], 10)

          dataoffset += readData[0] + 2 // skip ":{"
          obj = {}

          for (i = 0; i < keys; i++) {
            readData = _unserialize(data, dataoffset)
            key = readData[2]
            dataoffset += readData[1]

            readData = _unserialize(data, dataoffset)
            dataoffset += readData[1]
            obj[key] = readData[2]
          }

          dataoffset += 1 // skip "}"
          readdata = obj
          break
        }
        default:
          throw SyntaxError('Unknown / Unhandled data type(s): ' + dtype)
      }
      return [dtype, dataoffset - offset, typeconvert(readdata)]
    }

    try {
      if (typeof data !== 'string') {
        return false
      }

      return _unserialize(data, 0)[2]
    } catch (err) {
      console.error(err)
      return false
    }
  }
}
