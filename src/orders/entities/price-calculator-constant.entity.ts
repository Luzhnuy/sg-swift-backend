import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PriceCalculatorConstants {
  SurgeTimeKoef = 'Surge time koef',
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
}

export const PriceCalculatorDefaultKoefs = new Map<PriceCalculatorConstants, number>();
PriceCalculatorDefaultKoefs.set(PriceCalculatorConstants.SurgeTimeKoef, .2);
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

@Entity()
export class PriceCalculatorConstantEntity {

  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('enum', {
    nullable: false,
    enum: PriceCalculatorConstants,
  })
  key: PriceCalculatorConstants;

  @Column('decimal', { nullable: false, default: () => PriceCalculatorDefaultKoefs.get(this.key) })
  value: string;

  constructor(init?: Partial<PriceCalculatorConstantEntity>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}
