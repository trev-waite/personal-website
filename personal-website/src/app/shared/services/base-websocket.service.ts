import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, timer } from 'rxjs';
import { takeUntil, retry, catchError } from 'rxjs/operators';

export interface WebSocketMessage {
  type: 'fromClient' | 'fromSocket' | 'end' | 'ping' | 'error' | 'done';
  content?: string;
  timestamp?: number;
}

export abstract class BaseWebSocketService {
  protected socket$!: WebSocketSubject<any>;
  protected destroy$ = new Subject<void>();
  private keepaliveInterval: any;
  private reconnectAttempts = 0;
  protected lastMessageWasError = false;

  protected readonly BASE_URL = 'ws://localhost:8765';
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly KEEPALIVE_INTERVAL = 30000;

  connectionStatus$ = new Subject<string>();
  messageReceived$ = new Subject<WebSocketMessage>();

  abstract getEndpoint(): string;

  connect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.connectionStatus$.next('Connection failed after multiple attempts');
      return;
    }

    this.connectionStatus$.next('Connecting...');
    
    this.socket$ = webSocket({
      url: this.getEndpoint(),
      openObserver: { next: () => this.handleConnection() },
      closeObserver: { next: (event) => this.handleDisconnection(event) },
      serializer: (value) => JSON.stringify(value),
      deserializer: (e) => {
        try {
          if (typeof e.data === 'string') {
            if (e.data === '[DONE]') {
              return { type: 'end' };
            }
            try {
              return JSON.parse(e.data);
            } catch {
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

    this.setupSocketSubscription();
  }

  private setupSocketSubscription() {
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
      
      this.lastMessageWasError = false;
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
    this.connectionStatus$.next('Connected');
    this.reconnectAttempts = 0;
    this.setupKeepalive();
  }

  private handleDisconnection(event: CloseEvent) {
    this.connectionStatus$.next(`Disconnected (${event.code})`);
    this.clearKeepalive();
    if (event.code !== 1000) {
      this.attemptReconnection();
    }
  }

  private handleMessage(response: any) {
    const message = this.parseMessage(response);
    if (message) {
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
