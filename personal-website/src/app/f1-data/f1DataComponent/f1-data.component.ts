import { Component, computed, ElementRef, SecurityContext, signal, ViewChild } from '@angular/core';
import { DRIVER_NAMES } from './constants/driver-names.constants';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { RaceChatWebSocketService } from '../services/race-chat-websocket.service';
import { marked } from 'marked';
import { Clipboard } from '@angular/cdk/clipboard';
import { DisplayChatMessage, MessageFromAsssistant } from 'src/app/shared/interfaces/models';
import { RACES } from './constants/races';

@Component({
    selector: 'app-f1-data',
    templateUrl: './f1-data.component.html',
    styleUrls: ['./f1-data.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSelectModule]
})
export class F1DataComponent {
  DRIVER_NAMES = DRIVER_NAMES;
  RACES = RACES;
  race = signal<string>('');
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  
  private destroy$ = new Subject<void>();
  
  messages = signal<DisplayChatMessage[]>([]);
  currentMessage = signal<string>('');
  isStreaming = signal<boolean>(false);

  connectionStatus = signal<string>('Disconnected');

  private isAtBottom = true;
  showScrollButton = signal<boolean>(false);

  readonly placeholderText = computed(() => 
    this.connectionStatus() === 'Connected' ? 'Ask me anything...' : 'Connecting...'
  );

  readonly statusText = computed(() => 
    this.connectionStatus()
  );

  showChat = signal<boolean>(false);

  constructor(
    private sanitizer: DomSanitizer,
    private wsService: RaceChatWebSocketService,
    private clipboard: Clipboard
  ) {
    marked.setOptions({
      gfm: true,
      breaks: true
    });
  }

  ngOnInit() {
    this.setupWebSocketListeners();
    this.wsService.connect();
  }

  private setupWebSocketListeners() {
    this.wsService.connectionStatus$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.connectionStatus.set(status);
    });

    this.wsService.messageReceived$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(message => {
      this.handleMessage(message);
    });
  }

  private handleMessage(message: MessageFromAsssistant) {
    switch (message.role) {
      case 'assistant':
        if (!message.response) return;
        this.handleStreamMessage(message);
        break;

      case 'error':
        this.handleErrorMessage();
        break;
    }
  }

  private handleStreamMessage(message: MessageFromAsssistant) {
    const lastMessage = this.messages()[this.messages().length - 1];
    if (message.isDone) {
      this.handleStreamEnd();
      return;
    } else if (lastMessage?.isStreaming) {
      lastMessage.content += message.response;
      lastMessage.htmlContent = this.sanitizeAndRenderMarkdown(lastMessage.content);
      this.messages.set([...this.messages()]);
    } else {
      this.messages.update(msgs => [...msgs, {
        role: 'assistant',
        content: message.response,
        isStreaming: true,
        htmlContent: this.sanitizeAndRenderMarkdown(message.response),
        timestamp: new Date()
      }]);
    }
  }

  private handleErrorMessage() {
    // Remove any existing error messages
    this.messages.update(msgs => msgs.filter(m => m.role !== 'error'));
    
    // Add new error message with a timestamp
    this.messages.update(msgs => [...msgs, {
      role: 'error',
      content: 'Something broke :( please try again soon',
      htmlContent: 'Something broke :( please try again soon',
      isStreaming: false,
      timestamp: new Date()
    }]);
    this.isStreaming.set(false);
  }

  private handleStreamEnd() {
    const lastMessage = this.messages()[this.messages().length - 1];
    if (lastMessage?.isStreaming) {
      lastMessage.isStreaming = false;
      this.messages.set([...this.messages()]);
    }
    this.isStreaming.set(false);
    this.onScroll();
  }

  private scrollToMessage(index: number): void {
    setTimeout(() => {
      const element = this.messageContainer?.nativeElement;
      if (!element) return;
      
      const messages = element.getElementsByClassName('message-wrapper');
      if (messages && messages[index]) {
        messages[index].scrollIntoView({ behavior: 'smooth' });
      }
    }, 100); // Small delay to ensure DOM is updated
  }

  sendMessage() {
    const message = this.currentMessage().trim();
    if (!message || this.connectionStatus() !== 'Connected' || this.isStreaming()) {
      console.log('Message not sent. Connected:', this.connectionStatus() === 'Connected', 'Streaming:', this.isStreaming());
      return;
    }
    
    try {
      // Add user message with a timestamp
      this.messages.update(msgs => [...msgs, { 
        role: 'user', 
        content: message,
        htmlContent: message,
        timestamp: new Date()
      }]);

      // Immediately add loading assistant message with a timestamp
      this.messages.update(msgs => [...msgs, {
        role: 'assistant',
        content: '',
        htmlContent: '',
        isStreaming: true,
        timestamp: new Date()
      }]);
      
      // Scroll to the new assistant message
      this.scrollToMessage(this.messages().length - 1);
   
      // Send via WebSocket
      this.wsService.sendMessage(message, this.race());
      
      // Reset input and set streaming
      this.currentMessage.set('');
      this.isStreaming.set(true);
    } catch (error) {
      console.error('Component: Error sending message:', error);
    }
  }

  ngOnDestroy() {
    this.wsService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private sanitizeAndRenderMarkdown(content: string): string {
    const rawHtml = marked(content);
    return this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) || '';
  }

  onScroll() {
    const element = this.messageContainer?.nativeElement;
    if (!element) return;
    
    const threshold = 150; // Increased threshold for earlier button appearance
    const distanceFromBottom = element.scrollHeight - element.clientHeight - element.scrollTop;
    
    this.showScrollButton.set(distanceFromBottom > threshold);
  }

  scrollToBottom(force: boolean = false): void {
    const element = this.messageContainer?.nativeElement;
    if (!element) return;
    
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth'
    });
  }

  copyMessage(message: DisplayChatMessage): void {
    this.clipboard.copy(message.content);
    
    // Visual feedback on the button
    const buttons = document.getElementsByClassName('copy-button');
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i] as HTMLElement;
      button.style.transform = 'scale(0.8)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 200);
    }
  }

  getData() {
    if (!this.race()) return;
    this.showChat.set(true);
  }
}
