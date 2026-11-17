import React from 'react';
import { Icon } from '../../shared/ui/Icon';

export interface PortalNoticeItem {
  category: string;
  title: string;
  meta: string;
  followUpPrompt: string;
}

interface PortalArtifactPanelProps {
  items: PortalNoticeItem[];
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

export const PortalArtifactPanel: React.FC<PortalArtifactPanelProps> = ({
  items,
  onClose,
  onSelectPrompt,
}) => {
  return (
    <aside className="artifact notice-artifact" aria-label="공지사항 및 학사 안내">
      <header className="artifact-header">
        <div>
          <h2>학사 공지 · 캠퍼스 안내</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="공지사항 닫기"
        >
          <Icon name="close" />
        </button>
      </header>
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
    </aside>
  );
};
