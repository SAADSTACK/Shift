
export interface ShiftResponse {
  missing: string;
  differentWay: string;
  longTerm: string;
  nextStep: string;
  rawText: string;
  groundingUrls?: Array<{ uri: string; title?: string }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  parsedResponse?: ShiftResponse;
  imageUrl?: string;
  editedImageUrl?: string;
}

export enum AppMode {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  IMAGE = 'IMAGE'
}
