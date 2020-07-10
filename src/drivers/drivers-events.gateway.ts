import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { DriversService } from './services/drivers.service';
import { Subject } from 'rxjs';
import { DriverStatusEntity } from './entities/driver-status.entity';
import { DriverProfileEntity } from './entities/driver-profile.entity';
import { UsersService } from '../cms/users/services/users.service';

enum EventNames {
  ProfileEventName = 'drivers-profile-events',
  StatusEventName = 'drivers-status-events',
}

interface ProfileEvent {
  event: EventNames.ProfileEventName;
  data: Partial<DriverProfileEntity>;
}

interface StatusEvent {
  event: EventNames.StatusEventName;
  data: Partial<DriverStatusEntity>;
}

@WebSocketGateway(3001, { namespace: 'drivers' })
export class DriversEventsGateway implements OnGatewayDisconnect, OnGatewayConnection {

  private $$profilesEvents = new Subject<ProfileEvent>();
  private $$statusesEvents = new Subject<StatusEvent>();

  @WebSocketServer()
  server: Server;

  private websockets = new Map<WebSocket, Subject<ProfileEvent | StatusEvent>>();

  constructor(
    private driversService: DriversService,
    private usersService: UsersService,
  ) {
    this.driversService
      .$driverStatusesUpdates
      .subscribe(updates => {
        this.$$statusesEvents.next({
          event: EventNames.StatusEventName,
          data: updates,
        });
      });
    this.driversService
      .$driversProfilesUpdates
      .subscribe(updates => {
        this.$$profilesEvents.next({
          event: EventNames.ProfileEventName,
          data: updates,
        });
      });
  }

  @SubscribeMessage(EventNames.StatusEventName)
  handleStatusEvent(ws, data) {
    if (data.source === 'driver') {
      const payload = this.usersService.decodeAuthToken(data.token);
      this.usersService
        .getUserOneTimeAuth(payload)
        .then(async (user) => {
          const subscription = this.$$statusesEvents
            .subscribe(event => {
              if (!this.websockets.get(ws)) {
                subscription.unsubscribe();
              } else {
                if (event.data.authorId === user.id) {
                  this.websockets
                    .get(ws)
                    .next(event);
                }
              }
            });
        });
      return this.websockets.get(ws).asObservable();
    } else {
      return this.$$statusesEvents.asObservable();
    }
  }

  @SubscribeMessage(EventNames.ProfileEventName)
  handleProfileEvent(ws, data) {
    if (data.source === 'driver') {
      const payload = this.usersService.decodeAuthToken(data.token);
      this.usersService
        .getUserOneTimeAuth(payload)
        .then(async (user) => {
          const subscription = this.$$profilesEvents
            .subscribe(event => {
              if (!this.websockets.get(ws)) {
                subscription.unsubscribe();
              } else {
                if (event.data.userId === user.id) {
                  this.websockets
                    .get(ws)
                    .next(event);
                }
              }
            });
        });
      return this.websockets.get(ws).asObservable();
    } else {
      return this.$$profilesEvents.asObservable();
    }
  }

  handleDisconnect(ws): any {
    this.websockets.get(ws).complete();
    this.websockets.delete(ws);
  }

  handleConnection(ws): any {
    this.websockets.set(ws, new Subject<ProfileEvent | StatusEvent>());
  }
}
