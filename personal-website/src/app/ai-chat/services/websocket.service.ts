import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, Subject, timer } from 'rxjs';
import { takeUntil, retry, catchError } from 'rxjs/operators';

export interface WebSocketMessage {
  type: 'fromClient' | 'fromSocket' | 'end' | 'ping' | 'error' | 'done';
  content?: string;
  timestamp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket$!: WebSocketSubject<any>;
  private destroy$ = new Subject<void>();
  private keepaliveInterval: any;
  private reconnectAttempts = 0;
  private lastMessageWasError = false;

  private readonly WEBSOCKET_ENDPOINT = '';
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly KEEPALIVE_INTERVAL = 30000;

  connectionStatus$ = new Subject<string>();
  isConnected$ = new Subject<boolean>();
  messageReceived$ = new Subject<WebSocketMessage>();

  connect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.connectionStatus$.next('Connection failed after multiple attempts');
      return;
    }

    this.connectionStatus$.next('Connecting...');
    
    this.socket$ = webSocket({
      url: this.WEBSOCKET_ENDPOINT,
      openObserver: {
        next: () => this.handleConnection()
      },
      closeObserver: {
        next: (event: CloseEvent) => this.handleDisconnection(event)
      },
      serializer: (value) => {
        return JSON.stringify(value);
      },
      deserializer: (e) => {
        try {
          if (typeof e.data === 'string') {
            // Handle special [DONE] message
            if (e.data === '[DONE]') {
              return { type: 'end' };
            }
            // Try to parse as JSON first
            try {
              return JSON.parse(e.data);
            } catch {
              // If not JSON, treat as stream content
              return {
                type: 'error',
                content: e.data
              };
            }
          }
          return e.data;
        } catch (error) {
          console.error('Error deserializing message:', error);
          return e.data;
        }
      }
    });

    this.socket$.pipe(
      takeUntil(this.destroy$),
      retry(3),
      catchError((error) => {
        this.handleError(error);
        throw error;
      })
    ).subscribe({
      next: (response) => this.handleMessage(response),
      error: (error) => this.handleError(error)
    });
  }

  sendMessage(message: WebSocketMessage) {
    try {
      if (!this.socket$) {
        console.error('WebSocketService: Socket not initialized');
        return;
      }
      
      this.lastMessageWasError = false; // Reset error state
      const formattedMessage = {
        type: message.type,
        content: message.content,
        timestamp: Date.now()
      };
      
      this.socket$.next(formattedMessage);
    } catch (error) {
      console.error('WebSocketService: Error sending message:', error);
      this.connectionStatus$.next('Error sending message');
    }
  }

  private handleConnection() {
    this.isConnected$.next(true);
    this.connectionStatus$.next('Connected');
    this.reconnectAttempts = 0;
    this.setupKeepalive();
  }

  private handleDisconnection(event: CloseEvent) {
    this.isConnected$.next(false);
    this.connectionStatus$.next(`Disconnected (${event.code})`);
    this.clearKeepalive();
    if (event.code !== 1000) {
      this.attemptReconnection();
    }
  }

  private handleMessage(response: any) {
    const message = this.parseMessage(response);
    if (message) {
      // Only emit error message once
      if (message.type === 'error' && this.lastMessageWasError) {
        return;
      }
      this.lastMessageWasError = message.type === 'error';
      this.messageReceived$.next(message);
    }
  }

  private parseMessage(response: WebSocketMessage): WebSocketMessage | null {
    console.log('Received message:', response);
    try {
      if (response.type === 'error') {
          throw new Error(response.content);
      }
    
      return response;
    } catch (error) {
      console.error('Error parsing message:', error);
      return response;
    }
  }

  private setupKeepalive() {
    this.clearKeepalive();
    this.keepaliveInterval = setInterval(() => {
      this.sendMessage({ type: 'ping', timestamp: Date.now() });
    }, this.KEEPALIVE_INTERVAL);
  }

  private clearKeepalive() {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
    }
  }

  private attemptReconnection() {
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.connectionStatus$.next(`Reconnecting (attempt ${this.reconnectAttempts})...`);
      timer(2000).subscribe(() => this.connect());
    }
  }

  private handleError(error: any) {
    console.error('WebSocket error:', error);
    this.connectionStatus$.next('Connection error');
  }

  disconnect() {
    this.clearKeepalive();
    this.destroy$.next();
    this.destroy$.complete();
    if (this.socket$) {
      this.socket$.complete();
    }
  }
}
