import { Injectable } from '@angular/core';
import { BaseWebSocketService } from '../../shared/services/base-websocket.service';

@Injectable({
  providedIn: 'root'
})
export class RaceChatWebSocketService extends BaseWebSocketService {
  getEndpoint(): string {
    return `${this.BASE_URL}/race-chat`;
  }
}
