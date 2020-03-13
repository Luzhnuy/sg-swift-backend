import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { DriversService } from './services/drivers.service';
import { Subject } from 'rxjs';
import { DriverStatusEntity } from './entities/driver-status.entity';
import { DriverProfileEntity } from './entities/driver-profile.entity';

@WebSocketGateway(3001, { namespace: 'drivers' })
export class DriversEventsGateway {

  private $$driversProfileEvents = new Subject<{
    event: 'drivers-profile-events',
    data: Partial<DriverProfileEntity>,
  }>();
  private $$driversStatusEvents = new Subject<{
    event: 'drivers-status-events',
    data: Partial<DriverStatusEntity>,
  }>();

  @WebSocketServer()
  server: Server;

  constructor(
    private driversService: DriversService,
  ) {
    this.driversService
      .$driverStatusesUpdates
      .subscribe(updates => {
        this.$$driversStatusEvents.next({
          event: 'drivers-status-events',
          data: updates,
        });
      });
    this.driversService
      .$driversProfilesUpdates
      .subscribe(updates => {
        this.$$driversProfileEvents.next({
          event: 'drivers-profile-events',
          data: updates,
        });
      });
  }

  @SubscribeMessage('drivers-status-events')
  handleStatusEvent() {
    // TODO check permissions
    return this.$$driversStatusEvents.asObservable();
  }

  @SubscribeMessage('drivers-profile-events')
  handleProfileEvent() {
    // TODO check permissions
    return this.$$driversProfileEvents.asObservable();
  }

}
