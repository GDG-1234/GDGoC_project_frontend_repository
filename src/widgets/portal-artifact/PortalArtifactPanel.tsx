import React from 'react';
import {
  CafeteriaMenuCardUi,
  ChatCard,
  NoticeDetailCardUi,
  NoticeSearchCardUi,
} from '../../shared/types/portal';
import { Icon } from '../../shared/ui/Icon';

export interface PortalNoticeItem {
  category: string;
  title: string;
  meta: string;
  followUpPrompt: string;
}

interface PortalArtifactPanelProps {
  items: PortalNoticeItem[];
  cards?: ChatCard[];
  title?: string;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

function renderCafeteriaCard(ui: CafeteriaMenuCardUi, idx: number) {
  return (
    <section key={`cafeteria-${idx}`} className="portal-card">
      <div className="portal-card-head">
        <div>
          <span className="portal-badge">학식 메뉴</span>
          <h3>{ui.date || '오늘의 식단'}</h3>
        </div>
        {ui.stale && <span className="portal-stale-badge">이전 저장 식단</span>}
      </div>

      {ui.note && <p className="portal-card-note">{ui.note}</p>}

      <div className="portal-cafeteria-list">
        {(ui.cafeterias || []).map((cafeteria, cIdx) => (
          <div key={`${cafeteria.name}-${cIdx}`} className="portal-cafeteria-item">
            <div className="portal-cafeteria-title">
              <strong>{cafeteria.name}</strong>
              {cafeteria.closed && <span className="portal-closed-badge">휴무</span>}
            </div>
            {!cafeteria.closed && cafeteria.meals.length > 0 && (
              <div className="portal-meal-list">
                {cafeteria.meals.map((m, mIdx) => (
                  <div key={`${m.meal}-${m.corner}-${mIdx}`} className="portal-meal-row">
                    <div className="portal-meal-meta">
                      <b>{m.meal}</b>
                      {m.corner && <span>{m.corner}</span>}
                    </div>
                    <pre className="portal-meal-menu">{m.menu}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {ui.url && (
        <a
          href={ui.url}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-ext-link"
        >
          <span>생협 원문 식단표 보기</span>
          <Icon name="external" size={14} />
        </a>
      )}
    </section>
  );
}

function renderNoticeSearchCard(ui: NoticeSearchCardUi, idx: number) {
  const notices = ui.items || [];
  return (
    <section key={`notice-search-${idx}`} className="portal-card">
      <div className="portal-card-head">
        <div>
          <span className="portal-badge">학교 공지</span>
          <h3>검색 결과 ({notices.length}건)</h3>
        </div>
      </div>

      {notices.length === 0 ? (
        <p className="portal-card-note">조건에 맞는 공지가 없습니다.</p>
      ) : (
        <div className="portal-notice-items">
          {notices.map((notice) => (
            <a
              key={`${notice.board}-${notice.articleId}`}
              href={notice.url}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-notice-link"
            >
              <div className="portal-notice-meta">
                <b>{notice.board}</b>
                {notice.pinned && <span className="portal-pin-badge">고정</span>}
                <small>{notice.date}</small>
                {notice.views !== undefined && <small>조회 {notice.views}</small>}
              </div>
              <strong>{notice.title}</strong>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function renderNoticeDetailCard(ui: NoticeDetailCardUi, idx: number) {
  return (
    <section key={`notice-detail-${idx}`} className="portal-card">
      <div className="portal-card-head">
        <div>
          <span className="portal-badge">공지 상세</span>
          <h3>{ui.title}</h3>
          {ui.date && <small className="portal-card-date">{ui.date}</small>}
        </div>
      </div>

      {ui.attachments && ui.attachments.length > 0 && (
        <div className="portal-attachments">
          <span className="portal-attachments-label">첨부파일</span>
          {ui.attachments.map((file, fIdx) => (
            <a
              key={`${file.name}-${fIdx}`}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-attachment-link"
            >
              <span>{file.name}</span>
              <Icon name="external" size={14} />
            </a>
          ))}
        </div>
      )}

      {ui.url && (
        <a
          href={ui.url}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-ext-link"
        >
          <span>학교 공지 원문 보기</span>
          <Icon name="external" size={14} />
        </a>
      )}
    </section>
  );
}

export const PortalArtifactPanel: React.FC<PortalArtifactPanelProps> = ({
  items,
  cards,
  title,
  onClose,
  onSelectPrompt,
}) => {
  const hasCards = Boolean(cards && cards.length > 0);
  const heading = title || (hasCards ? '답변 상세 정보' : '학사 공지 · 캠퍼스 안내');

  return (
    <aside className="artifact notice-artifact" aria-label={heading}>
      <header className="artifact-header">
        <div>
          <h2>{heading}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="패널 닫기"
        >
          <Icon name="close" />
        </button>
      </header>

      {hasCards ? (
        <div className="portal-cards-body">
          {cards!.map((card, idx) => {
            if (card.toolName === 'cafeteria_get_menu') {
              return renderCafeteriaCard(
                card.ui as unknown as CafeteriaMenuCardUi,
                idx
              );
            }
            if (card.toolName === 'notice_search') {
              return renderNoticeSearchCard(
                card.ui as unknown as NoticeSearchCardUi,
                idx
              );
            }
            if (card.toolName === 'notice_get_detail') {
              return renderNoticeDetailCard(
                card.ui as unknown as NoticeDetailCardUi,
                idx
              );
            }
            return (
              <section key={`${card.toolName}-${idx}`} className="portal-card">
                <div className="portal-card-head">
                  <span className="portal-badge">{card.toolName}</span>
                </div>
                <pre className="portal-meal-menu">
                  {JSON.stringify(card.ui, null, 2)}
                </pre>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="notice-list">
          {items.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => onSelectPrompt(item.followUpPrompt)}
            >
              <span>
                <b>{item.category}</b>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </span>
              <Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};
