export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: Date;
  isError?: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isOpen: boolean;
}

export interface ChatRequest {
  question: string;
  conversationHistory: { role: string; content: string }[];
}

export interface ChatResponse {
  answer: string;
  sources?: string[];
  tokensUsed?: number;
}
