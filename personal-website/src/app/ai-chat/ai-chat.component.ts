import { Component, OnInit, OnDestroy, ElementRef, ViewChild, signal, computed, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { WebSocketService, WebSocketMessage } from './services/websocket.service';
import { Subject, takeUntil, timer, retry, catchError, interval } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';  // Add error role
  content: string;
  isStreaming?: boolean;
  htmlContent?: string;
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
  isConnected = signal<boolean>(false);
  isStreaming = signal<boolean>(false);

  connectionStatus = signal<string>('Disconnected');

  readonly placeholderText = computed(() => 
    this.isConnected() ? 'Ask me anything...' : 'Connecting...'
  );

  readonly statusText = computed(() => 
    this.isConnected() ? 'Connected' : this.connectionStatus()
  );

  constructor(
    private sanitizer: DomSanitizer,
    private wsService: WebSocketService
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
    this.wsService.isConnected$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(connected => {
      console.log('Connection status changed:', connected);
      this.isConnected.set(connected);
    });

    this.wsService.connectionStatus$.subscribe(status => {
      this.connectionStatus.set(status);
    });

    this.wsService.messageReceived$.subscribe(message => {
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
      this.scrollToBottom();
    } else {
      this.messages.update(msgs => [...msgs, {
        role: 'assistant',
        content: content || 'Loading...',
        htmlContent: this.sanitizeAndRenderMarkdown(content || ''),
        isStreaming: true
      }]);
      this.scrollToBottom();
    }
  }

  private handleErrorMessage() {
    // Remove any existing error messages
    this.messages.update(msgs => msgs.filter(m => m.role !== 'error'));
    
    // Add new error message
    this.messages.update(msgs => [...msgs, {
      role: 'error',
      content: 'Something broke :( please try again soon',
      htmlContent: 'Something broke :( please try again soon',
      isStreaming: false
    }]);
    this.isStreaming.set(false);
    this.scrollToBottom();
  }

  private handleStreamEnd() {
    const lastMessage = this.messages()[this.messages().length - 1];
    if (lastMessage?.isStreaming) {
      lastMessage.isStreaming = false;
      this.messages.set([...this.messages()]);
    }
    this.isStreaming.set(false);
    this.scrollToBottom();
  }

  sendMessage() {
    const message = this.currentMessage().trim();
    if (!message || !this.isConnected() || this.isStreaming()) {
      console.log('Message not sent. Connected:', this.isConnected(), 'Streaming:', this.isStreaming());
      return;
    }
    
    console.log('Component: Sending message:', message);
    
    try {
      this.messages.update(msgs => [...msgs, { 
        role: 'user', 
        content: message,
        htmlContent: message
      }]);
   
      this.wsService.sendMessage({ 
        type: 'fromClient', 
        content: message 
      });
      
      // Reset input and set streaming
      this.currentMessage.set('');
      this.isStreaming.set(true);
      this.scrollToBottom();
    } catch (error) {
      console.error('Component: Error sending message:', error);
    }
  }

  ngOnDestroy() {
    this.wsService.disconnect();
  }

  private sanitizeAndRenderMarkdown(content: string): string {
    const rawHtml = marked(content);
    return this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) || '';
  }

  private scrollToBottom(): void {
    // Wait for DOM update and then scroll
    requestAnimationFrame(() => {
      const element = this.messageContainer?.nativeElement;
      if (!element) return;
      
      // Check if user has scrolled up
      const isScrolledToBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 150;
      
      // Only auto-scroll if near bottom or is streaming
      if (isScrolledToBottom || this.isStreaming()) {
        setTimeout(() => {
          element.scrollTo({
            top: element.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
    });
  }
}
