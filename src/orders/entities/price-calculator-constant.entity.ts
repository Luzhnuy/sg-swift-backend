import { BeforeInsert, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../shared/column-numeric-transformer';

export enum PriceCalculatorConstants {
  SurgeTimeKoef = 'Surge time koef',
  SurgeTimeStart = 'Surge time starts in minutes. E.g. 15:45 = 15 * 60 + 45 = 945',
  SurgeTimeEnd = 'Surge time ends in minutes. E.g. 18:00 = 18 * 60 = 1080',
  BookingBaseFare = 'Booking base fare',
  BookingDistanceFareKoef = 'Booking distance fare koef',
  BookingDistanceFareMinDistance = 'Booking distance fare min distance (in meters)',
  BookingDistanceFareMaxDistance = 'Booking distance fare max distance (in meters)',
  BookingLargeOrderFare = 'Booking large order fare',
  BookingBringBackFareKoef = 'Booking bring back fare koef',
  MenuBaseFare = 'Menu base fare',
  CustomBaseFare = 'Custom base fare',
  CustomDistanceFareKoef = 'Custom distance fare koef',
  CustomDistanceFareMinDistance = 'Custom distance fare min distance (in meters)',
  CustomDistanceFareMaxDistance = 'Custom distance fare max distance (in meters)',
  TripBaseFare = 'Trip base fare',
  TripDistanceFareKoef = 'Trip distance fare koef',
  TripDistanceFareMinDistance = 'Trip distance fare min distance (in meters)',
  TripDistanceFareMaxDistance = 'Trip distance fare max distance (in meters)',
  TripMinOrderNumber = 'A minimum orders count in Trip order',
}

export const PriceCalculatorDefaultKoefs = new Map<PriceCalculatorConstants, number>();
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.SurgeTimeKoef, .2);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.SurgeTimeStart, 945);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.SurgeTimeEnd, 1080);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.BookingBaseFare, 12.99);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.BookingDistanceFareKoef, .9);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.BookingDistanceFareMinDistance, 3000);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.BookingDistanceFareMaxDistance, 30000);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.BookingLargeOrderFare, 3.33);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.BookingBringBackFareKoef, .55);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.MenuBaseFare, 4.99);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.CustomBaseFare, 12.99);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.CustomDistanceFareKoef, 1.5);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.CustomDistanceFareMinDistance, 3000);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.CustomDistanceFareMaxDistance, 20000);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.TripBaseFare, 12.99);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.TripDistanceFareKoef, .9);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.TripDistanceFareMinDistance, 3000);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.TripDistanceFareMaxDistance, 30000);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.TripDistanceFareMaxDistance, 30000);
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.TripMinOrderNumber, 5);

@Entity()
export class PriceCalculatorConstantEntity {

  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('enum', {
    nullable: false,
    enum: PriceCalculatorConstants,
  })
  key: PriceCalculatorConstants;

  @Column('decimal', {
    nullable: false,
    precision: 8,
    scale: 2,
    transformer: ColumnNumericTransformer,
  })
  value: number;

  @BeforeInsert()
  setDefaultValue() {
    this.value = PriceCalculatorDefaultKoefs.get(this.key);
  }

  constructor(init?: Partial<PriceCalculatorConstantEntity>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}
