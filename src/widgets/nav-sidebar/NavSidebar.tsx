import React from 'react';
import { ConversationSummary, UserResponse } from '../../shared/types/portal';
import { Icon, type IconName } from '../../shared/ui/Icon';

export type NavSectionKey =
  | 'chat'
  | 'cafeteria'
  | 'notice'
  | 'timetable'
  | 'map'
  | 'saved';

export interface SidebarHistoryItem {
  id: string;
  label: string;
}

interface NavSidebarProps {
  active: NavSectionKey;
  recentItems: SidebarHistoryItem[];
  conversations: ConversationSummary[];
  activeConversationId: number | null;
  user: UserResponse | null;
  authLoading: boolean;
  useMock: boolean;
  hasServerError: boolean;
  onSelectSection: (section: NavSectionKey) => void;
  onSelectRecent: (id: string) => void;
  onSelectConversation: (id: number) => void;
  onDeleteConversation: (id: number) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onRetryLiveServer: () => void;
  onCloseMobile?: () => void;
}

interface NavItemDef {
  id: NavSectionKey;
  label: string;
  icon: IconName;
  badge?: string;
}

const PORTAL_NAV_ITEMS: NavItemDef[] = [
  { id: 'chat', label: 'AI 질문', icon: 'chat' },
  { id: 'cafeteria', label: '오늘의 학식', icon: 'utensils' },
  { id: 'notice', label: '새 공지', icon: 'notice' },
  { id: 'timetable', label: '내 시간표', icon: 'calendar', badge: '예정' },
];

const MAP_NAV_ITEMS: NavItemDef[] = [
  { id: 'map', label: '캠퍼스 지도', icon: 'map' },
  { id: 'saved', label: '건물 · 편의시설', icon: 'bookmark' },
];

export const NavSidebar: React.FC<NavSidebarProps> = ({
  active,
  recentItems,
  conversations,
  activeConversationId,
  user,
  authLoading,
  useMock,
  hasServerError,
  onSelectSection,
  onSelectRecent,
  onSelectConversation,
  onDeleteConversation,
  onSignIn,
  onSignOut,
  onRetryLiveServer,
  onCloseMobile,
}) => {
  const statusText = authLoading
    ? '로그인 확인 중...'
    : user
    ? user.isAdmin
      ? `${user.email} · 관리자`
      : user.email
    : useMock
    ? 'Mock 임시 모드'
    : hasServerError
    ? '서버 연결 필요'
    : 'Google 로그인으로 시작';

  const displayName = user
    ? user.name || user.email.split('@')[0]
    : 'Google 로그인';

  const avatarInitial = user
    ? (user.name || user.email).slice(0, 1).toUpperCase()
    : 'G';

  const renderNavButton = (item: NavItemDef) => (
    <button
      key={item.id}
      type="button"
      className={active === item.id ? 'nav-item active' : 'nav-item'}
      aria-label={item.label}
      title={item.label}
      onClick={() => {
        onSelectSection(item.id);
        onCloseMobile?.();
      }}
    >
      <Icon name={item.icon} size={18} />
      <span className="nav-item-label">{item.label}</span>
      {item.badge && <em className="nav-item-badge">{item.badge}</em>}
    </button>
  );

  return (
    <aside className="sidebar" aria-label="아코봇 주 메뉴">
      <div className="brand-row">
        <button
          type="button"
          className="brand brand-stacked"
          onClick={() => {
            onSelectSection('chat');
            onCloseMobile?.();
          }}
          aria-label="아코봇 홈"
        >
          <small className="brand-sub">Dongguk University</small>
          <span>아코봇</span>
        </button>
        {onCloseMobile && (
          <button
            type="button"
            className="icon-button mobile-only"
            onClick={onCloseMobile}
            aria-label="메뉴 닫기"
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      <button
        type="button"
        className="new-chat"
        onClick={() => {
          onSelectSection('chat');
          onCloseMobile?.();
        }}
        aria-label="새로운 대화"
        title="새로운 대화"
      >
        <Icon name="plus" size={18} />
        <span>새로운 대화</span>
      </button>

      <nav className="main-nav" aria-label="주 메뉴">
        <div className="nav-group">
          <span className="nav-group-label">AI · 포털</span>
          {PORTAL_NAV_ITEMS.map(renderNavButton)}
        </div>
        <div className="nav-divider" aria-hidden="true" />
        <div className="nav-group">
          <span className="nav-group-label">캠퍼스 길안내</span>
          {MAP_NAV_ITEMS.map(renderNavButton)}
        </div>
      </nav>

      <div className="sidebar-bottom">
        <div className="history">
          <span className="eyebrow">최근 대화</span>
          {user ? (
            conversations.length === 0 ? (
              <span className="history-empty">아직 저장된 대화가 없어요</span>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={
                    activeConversationId === conv.id
                      ? 'history-row active'
                      : 'history-row'
                  }
                >
                  <button
                    type="button"
                    className="history-select-btn"
                    onClick={() => {
                      onSelectConversation(conv.id);
                      onCloseMobile?.();
                    }}
                    title={conv.title}
                  >
                    {conv.title}
                  </button>
                  <button
                    type="button"
                    className="history-delete-btn"
                    aria-label={`${conv.title} 대화 삭제`}
                    title="대화 삭제"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))
            )
          ) : recentItems.length === 0 ? (
            <span className="history-empty">로그인하면 대화가 저장돼요</span>
          ) : (
            recentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectRecent(item.id);
                  onCloseMobile?.();
                }}
                title={item.label}
              >
                {item.label}
              </button>
            ))
          )}
        </div>

        <button
          type="button"
          className="profile"
          disabled={authLoading}
          aria-label={
            user
              ? '로그아웃'
              : useMock || hasServerError
              ? '실서버 연결 또는 로그인'
              : 'Google 계정으로 로그인'
          }
          title={
            user
              ? '클릭하여 로그아웃'
              : useMock || hasServerError
              ? '클릭하여 Google 로그인 / 실서버 재연결'
              : '클릭하여 Google 계정으로 로그인'
          }
          onClick={() => {
            if (user) {
              onSignOut();
            } else {
              if (useMock || hasServerError) {
                onRetryLiveServer();
              }
              onSignIn();
            }
          }}
        >
          {user?.pictureUrl ? (
            <img
              src={user.pictureUrl}
              alt=""
              className="avatar avatar-img"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="avatar">{avatarInitial}</span>
          )}
          <span>
            <strong>{displayName}</strong>
            <small className={hasServerError && !useMock && !user ? 'status-err' : ''}>
              {statusText}
            </small>
          </span>
          <Icon name={user ? 'logout' : 'arrow'} size={18} />
        </button>

        <div className="sidebar-credit" aria-hidden="true">
          <span>GDGoC Dongguk</span>
          <strong>GDG 1234</strong>
        </div>
      </div>
    </aside>
  );
};
