import React from 'react';
import {
  formatDurationText,
  formatFloorLabel,
  formatStepActionLabel,
} from '../../shared/api/apiClient';
import { RouteResponse } from '../../shared/types/api';

interface ArtifactStepsPanelProps {
  routeResult: RouteResponse;
  activeStepIndex: number | null;
  onSelectStep: (stepIndex: number) => void;
  onCloseSheet: () => void;
}

export const ArtifactStepsPanel: React.FC<ArtifactStepsPanelProps> = ({
  routeResult,
  activeStepIndex,
  onSelectStep,
  onCloseSheet,
}) => {
  const { summary, steps } = routeResult;

  return (
    <div className="artifact-steps-pane">
      <div className="steps-sheet-header">
        <div className="steps-sheet-meta">
          <strong>단계별 이동 안내 ({steps.length}단계)</strong>
          <span>
            {formatDurationText(summary.totalSeconds)} · {summary.totalKcal} kcal · 실내 층변경{' '}
            {summary.floorChanges}회{summary.usesRoad ? ' · 차도포함' : ''}
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
          <strong>★ 학교 지름길 포함 경로</strong>
          {summary.savedSeconds !== null && summary.savedSeconds > 0 && (
            <span>({formatDurationText(summary.savedSeconds)} 빨라요)</span>
          )}
        </div>
      )}

      <ol className="steps-list">
        {steps.map((step) => {
          const isActive = activeStepIndex === step.index;
          return (
            <li key={step.index}>
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
            </li>
          );
        })}
      </ol>
    </div>
  );
};
