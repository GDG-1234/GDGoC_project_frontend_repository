import React from 'react';
import {
  formatDurationText,
  formatFloorLabel,
} from '../../shared/api/apiClient';
import { RouteResponse, StepAction } from '../../shared/types/api';

interface ArtifactStepsPanelProps {
  routeResult: RouteResponse | null;
  activeStepIndex: number | null;
  onSelectStep: (stepIndex: number) => void;
}

const ACTION_LABELS: Record<StepAction, string> = {
  START: '출발',
  WALK: '보행',
  ENTER_BUILDING: '건물 진입',
  EXIT_BUILDING: '건물 진출',
  STAIRS_UP: '계단 ↑',
  STAIRS_DOWN: '계단 ↓',
  ELEVATOR: '엘리베이터',
  UPHILL: '오르막',
  DOWNHILL: '내리막',
  ARRIVE: '도착',
};

export const ArtifactStepsPanel: React.FC<ArtifactStepsPanelProps> = ({
  routeResult,
  activeStepIndex,
  onSelectStep,
}) => {
  if (!routeResult) {
    return (
      <div className="artifact-steps-empty">
        대화창에서 출발지와 도착지를 물어보거나, 지도에서 건물을 선택해 출발·도착지로
        지정하면 단계별 이동 안내가 표시됩니다.
      </div>
    );
  }

  const { summary, steps } = routeResult;

  return (
    <div className="artifact-steps-pane">
      <div className="route-summary-card">
        <div className="summary-top-row">
          <div>
            <span className="summary-time">
              {formatDurationText(summary.totalSeconds)}
            </span>
            <span className="summary-sub">({summary.totalKcal} kcal)</span>
          </div>
          <span className="summary-meta">
            실내 층변경 {summary.floorChanges}회
            {summary.usesRoad ? ' · 차도포함' : ''}
          </span>
        </div>

        {summary.usesShortcut && (
          <div className="shortcut-highlight-banner">
            <strong>★ 학교 지름길 포함 경로</strong>
            {summary.savedSeconds !== null && summary.savedSeconds > 0 && (
              <span>({formatDurationText(summary.savedSeconds)} 빨라요)</span>
            )}
          </div>
        )}
      </div>

      <div className="steps-list-container">
        <div className="steps-list-header">
          <strong>단계별 이동 안내 ({steps.length}단계)</strong>
          <span className="steps-hint">단계를 누르면 지도 뷰로 이동합니다</span>
        </div>

        <ol className="steps-list">
          {steps.map((step) => {
            const isActive = activeStepIndex === step.index;
            return (
              <li key={step.index}>
                <button
                  type="button"
                  onClick={() => onSelectStep(step.index)}
                  className={`step-card ${isActive ? 'step-card-active' : ''}`}
                >
                  <div className="step-card-top">
                    <span className="step-num">{step.index + 1}</span>
                    <span className="step-action-badge">
                      {ACTION_LABELS[step.action]}
                    </span>
                    <span className="mono-tag">{formatFloorLabel(step.floor)}</span>
                    {step.seconds !== null && step.seconds > 0 && (
                      <span className="step-seconds">
                        {formatDurationText(step.seconds)}
                      </span>
                    )}
                  </div>
                  <div className="step-card-text">{step.text}</div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
