export type ChatRole = "system" | "user" | "assistant";

export type ChatProvider = "openai" | "gemini" | "openrouter" | "offline";

export interface ChatMessageSource {
  slug: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  sources?: ChatMessageSource[];
}

export interface ChatSessionSummary {
  id: string;
  postSlug: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  messageCount: number;
  memorySummary?: string;
  previewContent?: string;
}

export interface ChatContextSource {
  slug: string;
  title: string;
  score: number;
  chunk: string;
}

export interface ChatRouteRequest {
  sessionId?: string;
  message: string;
  provider?: ChatProvider;
  model?: string;
  apiKey?: string;
}

export interface ChatModelOption {
  id: string;
  label: string;
}

export interface ChatPromptMessage {
  role: ChatRole;
  content: string;
}

export interface ChatStreamMetadata {
  sessionId: string;
  provider: ChatProvider;
  model: string;
  sources: ChatMessageSource[];
}
