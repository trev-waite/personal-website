import { Component, Input, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Subject, Subscription, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
  text: string;
  isUser: boolean;
  chunks: string[];
  displayedChunks: number;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat-v2.component.html',
  styleUrls: ['./ai-chat-v2.component.scss'] 
})
export class AiChatV2Component implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  messages: Message[] = [];
  userInput = '';
  isTyping = false;
  
  private destroy$ = new Subject<void>();
  private botResponseSubscription?: Subscription;
  
  // Example values - replace with actual service integration
  private chunkSize = 20; // Characters per chunk
  private chunkDelay = 50; // Milliseconds between chunks

  constructor() {}

  ngOnInit() {
    // Optional: Add a welcome message
    this.addBotMessage("Hi there! I'm your AI assistant. How can I help you today?");
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.botResponseSubscription) {
      this.botResponseSubscription.unsubscribe();
    }
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text) return;
    
    // Add user message
    this.messages.push({
      text,
      isUser: true,
      chunks: [text],
      displayedChunks: 1,
      timestamp: new Date()
    });
    
    this.userInput = '';
    this.scrollToBottom();
    
    // Simulate bot response
    this.isTyping = true;
    setTimeout(() => {
      // This is where you'd call your actual API
      this.simulateBotResponse("This is a simulated response to demonstrate the chunking functionality. You would replace this with your actual API call to get responses from your AI model.");
    }, 1000);
  }

  private addBotMessage(text: string) {
    const chunks = this.chunkifyText(text);
    const newMessage: Message = {
      text,
      isUser: false,
      chunks,
      displayedChunks: 0,
      timestamp: new Date()
    };
    
    this.messages.push(newMessage);
    this.scrollToBottom();
    
    // Animate the chunks appearing
    let currentIndex = this.messages.length - 1;
    
    this.botResponseSubscription = interval(this.chunkDelay)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.messages[currentIndex].displayedChunks < chunks.length) {
          this.messages[currentIndex].displayedChunks++;
          this.scrollToBottom();
        } else {
          this.isTyping = false;
          if (this.botResponseSubscription) {
            this.botResponseSubscription.unsubscribe();
          }
        }
      });
  }

  private simulateBotResponse(text: string) {
    this.addBotMessage(text);
  }

  private chunkifyText(text: string): string[] {
    const chunks: string[] = [];
    let currentIndex = 0;
    
    while (currentIndex < text.length) {
      // Find a natural break point (space, period, etc.) near the chunk size
      let endIndex = Math.min(currentIndex + this.chunkSize, text.length);
      
      // If we're not at the end and not at a natural break, find one
      if (endIndex < text.length && text[endIndex] !== ' ' && text[endIndex] !== '.') {
        // Look for the last space before the chunk size
        const lastSpace = text.lastIndexOf(' ', endIndex);
        if (lastSpace > currentIndex && lastSpace - currentIndex > this.chunkSize / 2) {
          endIndex = lastSpace + 1; // Include the space
        }
      }
      
      chunks.push(text.substring(currentIndex, endIndex));
      currentIndex = endIndex;
    }
    
    return chunks;
  }

  private scrollToBottom() {
    setTimeout(() => {
      try {
        this.scrollContainer.nativeElement.scrollTop = 
          this.scrollContainer.nativeElement.scrollHeight;
      } catch (err) {}
    }, 0);
  }
}