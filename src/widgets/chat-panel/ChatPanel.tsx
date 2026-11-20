import React, { useEffect, useRef, useState } from 'react';
import {
  BuildingDetailResponse,
  PlaceSummary,
  RouteMode,
  RouteResponse,
} from '../../shared/types/api';
import { ChatCard } from '../../shared/types/portal';
import { Icon, type IconName } from '../../shared/ui/Icon';

export interface ChatArtifactPayload {
  id: string;
  kind: 'ROUTE' | 'BUILDING' | 'NOTICE' | 'CARDS';
  title: string;
  fromPlace?: PlaceSummary | null;
  toPlace?: PlaceSummary | null;
  routeResult?: RouteResponse | null;
  mode?: RouteMode;
  avoidRoad?: boolean;
  buildingDetail?: BuildingDetailResponse | null;
  cards?: ChatCard[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  artifact?: ChatArtifactPayload;
  suggestions?: string[];
  isError?: boolean;
  canFallbackToMock?: boolean;
}

export interface PromptSuggestionItem {
  label: string;
  icon: IconName;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  activeArtifactId: string | null;
  isArtifactOpen: boolean;
  mobileChatTitle: string;
  showRouteOptions: boolean;
  isLoading: boolean;
  useMock: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  remainingToday: number | null;
  mode: RouteMode;
  avoidRoad: boolean;
  suggestions: PromptSuggestionItem[];
  onSendMessage: (text: string) => void;
  onOpenArtifact: (artifact: ChatArtifactPayload) => void;
  onChangeMode: (mode: RouteMode) => void;
  onToggleAvoidRoad: () => void;
  onFallbackToMock: () => void;
  onSignIn: () => void;
}

const Composer: React.FC<{
  compact?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (text: string) => void;
}> = ({
  compact = false,
  disabled = false,
  placeholder = '어디로 가볼까요?',
  onSubmit,
}) => {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue('');
    onSubmit(trimmed);
  };

  return (
    <div className={compact ? 'composer compact' : 'composer'}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            handleSend();
          }
        }}
        placeholder={placeholder}
        aria-label="메시지 입력"
        maxLength={2000}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={handleSend}
        aria-label="메시지 보내기"
        disabled={disabled || !value.trim()}
      >
        <Icon name="send" size={19} />
      </button>
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  activeArtifactId,
  isArtifactOpen,
  mobileChatTitle,
  showRouteOptions,
  isLoading,
  useMock,
  isAuthenticated,
  authLoading,
  authError,
  remainingToday,
  mode,
  avoidRoad,
  suggestions,
  onSendMessage,
  onOpenArtifact,
  onChangeMode,
  onToggleAvoidRoad,
  onFallbackToMock,
  onSignIn,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading]);

  const composerPlaceholder = isAuthenticated
    ? '학식, 공지, 캠퍼스 생활 무엇이든 물어보세요'
    : '어디로 가볼까요? (AI 채팅·저장은 Google 로그인)';

  if (messages.length === 0) {
    return (
      <main className="chat-main empty-chat">
        <div className="empty-content">
          <h1>
            캠퍼스에서 무엇을
            <br />
            도와드릴까요?
          </h1>
          <p className="lead">
            길안내부터 학식과 학사 일정까지,
            <br className="desktop-only" /> 아코봇이 빠르게 찾아드릴게요.
          </p>

          {!isAuthenticated && (
            <div className="auth-cta-bar">
              <button
                type="button"
                className="google-login-btn"
                disabled={authLoading}
                onClick={onSignIn}
              >
                <span>
                  {authLoading
                    ? '로그인 상태 확인 중...'
                    : 'Google 계정으로 로그인하고 AI 채팅 시작'}
                </span>
                <Icon name="arrow" size={16} />
              </button>
              {authError && (
                <p className="auth-error-text" role="alert">
                  {authError}
                </p>
              )}
            </div>
          )}

          <Composer
            disabled={isLoading}
            placeholder={composerPlaceholder}
            onSubmit={onSendMessage}
          />
          <div className="suggestions">
            {suggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onSendMessage(item.label)}
                disabled={isLoading}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        </div>
        <p className="disclaimer">
          {remainingToday !== null
            ? `오늘 남은 메시지 ${remainingToday} / 50 · 아코봇은 실수를 할 수 있어요.`
            : '아코봇은 실수를 할 수 있어요. 중요한 정보는 한 번 더 확인해 주세요.'}
        </p>
      </main>
    );
  }

  return (
    <main className="chat-main conversation">
      <div className="mobile-chat-title">{mobileChatTitle}</div>
      <div className="messages" role="log" aria-live="polite">
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="message user">
              {msg.text}
            </div>
          ) : (
            <div
              key={msg.id}
              className={`assistant-message ${
                msg.isError ? 'assistant-message-error' : ''
              }`}
            >
              <span className="assistant-avatar" aria-hidden="true">
                A
              </span>
              <div className="assistant-body">
                <p className="assistant-text">{msg.text}</p>

                {msg.canFallbackToMock && !useMock && (
                  <div className="assistant-fallback-row">
                    <button
                      type="button"
                      className="fallback-mock-btn"
                      onClick={onFallbackToMock}
                    >
                      Mock 데이터로 대신 보기
                    </button>
                  </div>
                )}

                {msg.artifact && (
                  <button
                    type="button"
                    className={
                      isArtifactOpen && activeArtifactId === msg.artifact.id
                        ? 'inline-action active'
                        : 'inline-action'
                    }
                    onClick={() => msg.artifact && onOpenArtifact(msg.artifact)}
                  >
                    <Icon
                      name={
                        msg.artifact.kind === 'NOTICE' ||
                        msg.artifact.kind === 'CARDS'
                          ? 'notice'
                          : 'map'
                      }
                      size={17}
                    />
                    <span>
                      {msg.artifact.kind === 'ROUTE'
                        ? `지도에서 코스 보기 (${msg.artifact.title})`
                        : msg.artifact.title}
                    </span>
                    <Icon name="arrow" size={16} />
                  </button>
                )}

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="assistant-suggestions">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="assistant-suggestion-chip"
                        onClick={() => onSendMessage(s)}
                        disabled={isLoading}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {isLoading && (
          <div className="assistant-message">
            <span className="assistant-avatar" aria-hidden="true">
              A
            </span>
            <div className="assistant-body">
              <p className="assistant-text">
                {isAuthenticated
                  ? '답변을 준비하고 있어요...'
                  : '캠퍼스 정보를 찾고 있어요...'}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="conversation-composer">
        {showRouteOptions && (
          <div className="composer-route-options" role="group" aria-label="경로 옵션">
            <button
              type="button"
              className={mode === 'FASTEST' ? 'option-chip active' : 'option-chip'}
              onClick={() => onChangeMode('FASTEST')}
            >
              빠른 길
            </button>
            <button
              type="button"
              className={mode === 'EASIEST' ? 'option-chip active' : 'option-chip'}
              onClick={() => onChangeMode('EASIEST')}
            >
              편한 길
            </button>
            <button
              type="button"
              className={avoidRoad ? 'option-chip active' : 'option-chip'}
              aria-pressed={avoidRoad}
              onClick={onToggleAvoidRoad}
            >
              차도 피하기
            </button>
          </div>
        )}
        <Composer
          compact
          disabled={isLoading}
          placeholder={composerPlaceholder}
          onSubmit={onSendMessage}
        />
        <p>
          {remainingToday !== null
            ? `오늘 남은 메시지 ${remainingToday} / 50 · 아코봇은 실수를 할 수 있어요.`
            : '아코봇은 실수를 할 수 있어요. 중요한 정보는 한 번 더 확인해 주세요.'}
        </p>
      </div>
    </main>
  );
};
