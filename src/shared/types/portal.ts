// ============================================================================
// 인증 · 채팅 · 답변 카드(포털) API TypeScript 인터페이스 정의
// ============================================================================

export type PortalErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'EMAIL_NOT_ALLOWED'
  | 'CONVERSATION_NOT_FOUND'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'AI_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface PortalErrorResponse {
  error: {
    code: PortalErrorCode;
    message: string;
  };
}

export interface UserResponse {
  id: number;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export type ChatMessageRole = 'user' | 'assistant';

export interface CafeteriaMeal {
  meal: string;
  corner: string;
  menu: string;
}

export interface CafeteriaEntry {
  name: string;
  closed: boolean;
  meals: CafeteriaMeal[];
}

export interface CafeteriaMenuCardUi {
  date: string;
  today?: boolean;
  stale: boolean;
  note: string | null;
  url: string;
  cafeterias: CafeteriaEntry[];
}

export interface NoticeSearchItem {
  board: string;
  articleId: string | number;
  title: string;
  date: string;
  views?: number;
  pinned?: boolean;
  url: string;
}

export interface NoticeSearchCardUi {
  items: NoticeSearchItem[];
}

export interface NoticeAttachment {
  name: string;
  url: string;
}

export interface NoticeDetailCardUi {
  title: string;
  date: string;
  url: string;
  attachments: NoticeAttachment[];
}

export interface ChatCard {
  toolName: string;
  ui: Record<string, unknown>;
}

export interface MessageResponse {
  id: number;
  role: ChatMessageRole;
  content: string;
  cards: ChatCard[];
  createdAt: string;
}

export interface ConversationSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListResponse {
  items: ConversationSummary[];
}

export interface ConversationDetail extends ConversationSummary {
  messages: MessageResponse[];
}

export interface CreateConversationRequest {
  title?: string | null;
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
  remainingToday: number;
}
