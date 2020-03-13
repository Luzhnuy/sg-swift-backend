import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activation_user', { database: 'snapgrab_prod' })
export class ActivationUser {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'phone_number', length: 20 })
  phoneNumber: string;

  @Column('datetime', { name: 'date_reported' })
  dateReported: Date;

  @Column('tinyint', { name: 'activated', default: () => '"0"' })
  activated: boolean;

  @Column('varchar', { name: 'new_user', nullable: true, length: 255 })
  newUser: string | null;

  @Column('varchar', { name: 'activation_code', length: 10 })
  activationCode: string;
}
