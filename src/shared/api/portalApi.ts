import {
  ConversationDetail,
  ConversationListResponse,
  ConversationSummary,
  CreateConversationRequest,
  PortalErrorCode,
  PortalErrorResponse,
  SendMessageRequest,
  SendMessageResponse,
  UserResponse,
} from '../types/portal';
import { getFirebaseIdToken } from './firebaseAuth';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class PortalApiError extends Error {
  public readonly status: number;
  public readonly code: PortalErrorCode;
  public readonly debugMessage: string;

  constructor(status: number, code: PortalErrorCode, debugMessage: string) {
    super(getPortalErrorMessage(code));
    this.status = status;
    this.code = code;
    this.debugMessage = debugMessage;
  }
}

export function getPortalErrorMessage(code: PortalErrorCode): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return '로그인이 필요하거나 세션이 만료되었어요. 다시 로그인해 주세요.';
    case 'FORBIDDEN':
      return '이 기능에 접근할 권한이 없어요.';
    case 'EMAIL_NOT_ALLOWED':
      return '허용되지 않은 이메일 계정이에요. 학교 이메일로 로그인해 주세요.';
    case 'CONVERSATION_NOT_FOUND':
      return '대화를 찾을 수 없어요. 이미 삭제되었거나 접근할 수 없는 대화입니다.';
    case 'DAILY_LIMIT_EXCEEDED':
      return '오늘 보낼 수 있는 메시지(50개)를 모두 사용했어요. 내일 0시 이후에 다시 이용할 수 있어요.';
    case 'AI_UNAVAILABLE':
      return 'AI 응답 서버가 일시적으로 응답하지 않아요. 잠시 후 다시 시도해 주세요.';
    case 'VALIDATION_ERROR':
      return '메시지는 1자 이상 2,000자 이하로 입력해 주세요.';
    case 'INTERNAL_ERROR':
    default:
      return '서버와 통신하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
  }
}

async function requestAuthJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = await getFirebaseIdToken();
  if (!token) {
    throw new PortalApiError(401, 'UNAUTHORIZED', 'Missing Firebase ID token');
  }

  const url = `${DEFAULT_API_BASE}${path}`;
  let response: Response;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...((options?.headers as Record<string, string> | undefined) || {}),
    };
    if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new PortalApiError(
      500,
      'INTERNAL_ERROR',
      err instanceof Error ? err.message : 'Network error'
    );
  }

  if (!response.ok) {
    let parsedError: PortalErrorResponse | null = null;
    try {
      parsedError = (await response.json()) as PortalErrorResponse;
    } catch {
      // ignore JSON parse failure
    }
    const code: PortalErrorCode = parsedError?.error?.code || 'INTERNAL_ERROR';
    const debugMsg = parsedError?.error?.message || `HTTP ${response.status}`;
    throw new PortalApiError(response.status, code, debugMsg);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// GET /users/me (최초 호출 시 자동 회원가입)
export async function fetchMe(): Promise<UserResponse> {
  return requestAuthJson<UserResponse>('/users/me');
}

// GET /conversations
export async function fetchConversations(): Promise<ConversationListResponse> {
  return requestAuthJson<ConversationListResponse>('/conversations');
}

// POST /conversations
export async function createConversation(
  body?: CreateConversationRequest
): Promise<ConversationSummary> {
  return requestAuthJson<ConversationSummary>('/conversations', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

// GET /conversations/{id}
export async function fetchConversationDetail(
  conversationId: number
): Promise<ConversationDetail> {
  return requestAuthJson<ConversationDetail>(`/conversations/${conversationId}`);
}

// DELETE /conversations/{id}
export async function deleteConversation(
  conversationId: number
): Promise<void> {
  return requestAuthJson<void>(`/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}

// POST /conversations/{id}/messages
export async function sendConversationMessage(
  conversationId: number,
  body: SendMessageRequest
): Promise<SendMessageResponse> {
  return requestAuthJson<SendMessageResponse>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}
