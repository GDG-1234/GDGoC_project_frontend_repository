import React from 'react';
import {
  formatDurationText,
  formatFloorLabel,
  formatStepActionLabel,
} from '../../shared/api/apiClient';
import { RouteResponse } from '../../shared/types/api';
import { Icon } from '../../shared/ui/Icon';

interface ArtifactStepsPanelProps {
  routeResult: RouteResponse;
  activeStepIndex: number | null;
  onSelectStep: (stepIndex: number) => void;
  onCloseSheet: () => void;
  onFeedback?: (kind: 'SHORTCUT' | 'REPORT') => void;
}

export const ArtifactStepsPanel: React.FC<ArtifactStepsPanelProps> = ({
  routeResult,
  activeStepIndex,
  onSelectStep,
  onCloseSheet,
  onFeedback,
}) => {
  const { summary, steps } = routeResult;

  return (
    <div className="artifact-steps-pane">
      <div className="steps-sheet-header">
        <div className="steps-sheet-meta">
          <strong>
            소요 시간: {formatDurationText(summary.totalSeconds)} ({steps.length}단계)
          </strong>
          <span>
            {summary.totalKcal} kcal · 실내 층변경 {summary.floorChanges}회
            {summary.usesRoad ? ' · 차도포함' : ''}
          </span>
        </div>
        <button
          type="button"
          className="route-steps-toggle"
          onClick={onCloseSheet}
          aria-expanded="true"
        >
          접기 ▾
        </button>
      </div>

      {summary.usesShortcut && (
        <div className="shortcut-highlight-banner">
          <strong>
            <Icon name="bolt" size={14} /> 학교 지름길 포함 경로
          </strong>
          {summary.savedSeconds !== null && summary.savedSeconds > 0 && (
            <span>
              일반 루트보다 {formatDurationText(summary.savedSeconds)} 단축!
            </span>
          )}
        </div>
      )}

      <ol className="steps-list steps-flow-list">
        {steps.map((step, idx) => {
          const isActive = activeStepIndex === step.index;
          return (
            <li key={step.index} className="step-flow-item">
              <button
                type="button"
                onClick={() => onSelectStep(step.index)}
                className={`step-row ${isActive ? 'step-row-active' : ''}`}
              >
                <span className="step-num">{step.index + 1}</span>
                <div className="step-row-body">
                  <div className="step-row-top">
                    <span className="step-action-badge">
                      {formatStepActionLabel(step.action)}
                    </span>
                    <span className="mono-tag">{formatFloorLabel(step.floor)}</span>
                    {step.seconds !== null && step.seconds > 0 && (
                      <span className="step-seconds">
                        {formatDurationText(step.seconds)}
                      </span>
                    )}
                  </div>
                  <div className="step-row-text">{step.text}</div>
                </div>
              </button>
              {idx < steps.length - 1 && (
                <span className="step-flow-arrow" aria-hidden="true">
                  ⌄
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {onFeedback && (
        <div className="steps-sheet-footer-actions">
          <button
            type="button"
            className="artifact-aux-chip"
            onClick={() => onFeedback('SHORTCUT')}
          >
            <Icon name="bolt" size={13} />
            <span>지름길 제보</span>
          </button>
          <button
            type="button"
            className="artifact-aux-chip"
            onClick={() => onFeedback('REPORT')}
          >
            <Icon name="flag" size={13} />
            <span>길 오류 신고</span>
          </button>
        </div>
      )}
    </div>
  );
};
