import React from 'react';
import { Icon, type IconName } from '../../shared/ui/Icon';

export type NavSectionKey = 'chat' | 'map' | 'saved' | 'notice';

export interface SidebarHistoryItem {
  id: string;
  label: string;
}

interface NavSidebarProps {
  active: NavSectionKey;
  recentItems: SidebarHistoryItem[];
  useMock: boolean;
  hasServerError: boolean;
  onSelectSection: (section: NavSectionKey) => void;
  onSelectRecent: (id: string) => void;
  onRetryLiveServer: () => void;
  onCloseMobile?: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSectionKey;
  label: string;
  icon: IconName;
}> = [
  { id: 'chat', label: '새 채팅', icon: 'chat' },
  { id: 'map', label: '캠퍼스 길안내', icon: 'map' },
  { id: 'saved', label: '건물 · 편의시설', icon: 'bookmark' },
  { id: 'notice', label: '학사 공지 · 일정', icon: 'notice' },
];

export const NavSidebar: React.FC<NavSidebarProps> = ({
  active,
  recentItems,
  useMock,
  hasServerError,
  onSelectSection,
  onSelectRecent,
  onRetryLiveServer,
  onCloseMobile,
}) => {
  const statusText = useMock
    ? 'Mock 임시 모드'
    : hasServerError
    ? '서버 연결 필요'
    : '실서버 연동 (/api/v1)';

  return (
    <aside className="sidebar" aria-label="아코봇 주 메뉴">
      <div className="brand-row">
        <button
          type="button"
          className="brand"
          onClick={() => {
            onSelectSection('chat');
            onCloseMobile?.();
          }}
          aria-label="아코봇 홈"
        >
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
        {NAV_ITEMS.map((item) => (
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
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="history">
          <span className="eyebrow">최근 대화</span>
          {recentItems.length === 0 ? (
            <span className="history-empty">아직 열린 안내가 없어요</span>
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
          aria-label={useMock ? '실서버 연결 재시도' : statusText}
          title={useMock ? '클릭하여 실서버 연결 재시도' : statusText}
          onClick={() => {
            if (useMock || hasServerError) {
              onRetryLiveServer();
            }
          }}
        >
          <span className="avatar">게</span>
          <span>
            <strong>게스트</strong>
            <small className={hasServerError && !useMock ? 'status-err' : ''}>
              {statusText}
            </small>
          </span>
          <Icon name="settings" size={18} />
        </button>
      </div>
    </aside>
  );
};
