import { Component, OnInit, OnDestroy, ElementRef, ViewChild, signal, computed, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ChatWebSocketService } from './services/chat-websocket.service';
import { WebSocketMessage } from '../shared/services/base-websocket.service';
import { Subject, takeUntil, timer, retry, catchError, interval } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  isStreaming?: boolean;
  htmlContent?: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss']
})
export class AiChatComponent implements OnInit, OnDestroy {
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  
  private destroy$ = new Subject<void>();
  
  messages = signal<ChatMessage[]>([]);
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

  constructor(
    private sanitizer: DomSanitizer,
    private wsService: ChatWebSocketService  // Updated service
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

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'fromSocket':
        if (!message.content) return;
        this.handleStreamMessage(message.content);
        break;

      case 'error':
        this.handleErrorMessage();
        break;

      case 'done':
        this.handleStreamEnd();
        break;
    }
  }

  private handleStreamMessage(content: string) {
    const lastMessage = this.messages()[this.messages().length - 1];
    if (lastMessage?.isStreaming) {
      lastMessage.content += content;
      lastMessage.htmlContent = this.sanitizeAndRenderMarkdown(lastMessage.content);
      this.messages.set([...this.messages()]);
    } else {
      this.messages.update(msgs => [...msgs, {
        role: 'assistant',
        content: content,
        isStreaming: true,
        htmlContent: this.sanitizeAndRenderMarkdown(content),
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
      this.wsService.sendMessage({ 
        type: 'fromClient', 
        content: message 
      });
      
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
}
