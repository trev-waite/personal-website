import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, timer } from 'rxjs';
import { takeUntil, retry, catchError } from 'rxjs/operators';
import { MessageFromAsssistant, MessageFromUser, RaceDataMessageFromUser } from '../interfaces/models';

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
  messageReceived$ = new Subject<MessageFromAsssistant>();

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
      deserializer: (e) => JSON.parse(e.data)
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

  sendMessage(prompt: string, race?: string) {
    try {
      if (!this.socket$) {
        console.error('WebSocketService: Socket not initialized');
        return;
      }
      
      this.lastMessageWasError = false;
      let formattedMessage: MessageFromUser | RaceDataMessageFromUser;
      if (race) { 
        formattedMessage = {
          role: `user`,
          prompt: prompt,
          timestamp: Date.now(),
          race: race
        } as RaceDataMessageFromUser;
      } else {
        formattedMessage = {
          role: `user`,
          prompt: prompt,
          timestamp: Date.now()
        } as MessageFromUser;
      }
      
      this.socket$.next(formattedMessage);
    } catch (error) {
      console.error('WebSocketService: Error sending message:', error);
      this.connectionStatus$.next('Error sending message');
    }
  }

  sendPingMessage() {
    try {
      if (!this.socket$) {
        console.error('WebSocketService: Socket not initialized');
        return;
      }
      const formattedMessage = {
          role: `ping`,
          prompt: '',
          timestamp: Date.now()
        } as MessageFromUser;

      
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

  private handleMessage(response: MessageFromAsssistant) {
    if (response) {
      if (response.role === 'error' && this.lastMessageWasError) {
        return;
      }
      this.lastMessageWasError = response.role === 'error';
      this.messageReceived$.next(response);
    }
  }

  private setupKeepalive() {
    this.clearKeepalive();
    this.keepaliveInterval = setInterval(() => {
      this.sendPingMessage();
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
