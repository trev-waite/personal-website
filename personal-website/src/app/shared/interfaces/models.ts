
export interface MessageFromAsssistant {
    role: 'assistant' | 'error';
    response: string;
    isDone: boolean;
    timestamp: Date;
}

export interface MessageFromUser {
    role: 'user' | 'ping';
    prompt: string;
    timestamp: number;
}

export interface RaceDataMessageFromUser extends MessageFromUser {
    race: string;
}


export interface DisplayChatMessage {
    role: 'user' | 'assistant' | 'error';
    content: string;
    isStreaming?: boolean;
    htmlContent?: string;
    timestamp: Date;
}