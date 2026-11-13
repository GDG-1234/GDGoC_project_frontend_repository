import React, { useEffect, useState } from 'react';
import {
  formatDurationText,
  formatFloorLabel,
  searchPlaces,
} from '../../shared/api/apiClient';
import {
  PlaceSummary,
  RouteMode,
  RouteResponse,
  StepAction,
} from '../../shared/types/api';

import { MapPickTarget } from '../../shared/types/ui';

interface RouteSidebarProps {
  fromPlace: PlaceSummary | null;
  toPlace: PlaceSummary | null;
  mode: RouteMode;
  avoidRoad: boolean;
  routeResult: RouteResponse | null;
  activeStepIndex: number | null;
  mapPickTarget: MapPickTarget;
  errorText: string | null;
  isLoading: boolean;
  onSelectFrom: (place: PlaceSummary) => void;
  onSelectTo: (place: PlaceSummary) => void;
  onSwapPlaces: () => void;
  onChangeMode: (mode: RouteMode) => void;
  onToggleAvoidRoad: () => void;
  onChangeMapPickTarget: (target: MapPickTarget) => void;
  onSelectStep: (stepIndex: number) => void;
  onApplyPreset: (fromName: string, toName: string) => void;
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

// 실서버 DB의 ID는 mock과 다를 수 있으므로 ID가 아니라 장소 이름으로 지정한다.
const QUICK_ROUTE_PRESETS = [
  { label: '팔정도 → 신공 4142호', from: '팔정도', to: '신공학관 4142호' },
  { label: '혜화관 3층 → 경영관 3층', from: '혜화관 3층', to: '경영관 3층' },
  { label: '후문 → 명진관 1층', from: '후문', to: '명진관 1층' },
];

export const RouteSidebar: React.FC<RouteSidebarProps> = ({
  fromPlace,
  toPlace,
  mode,
  avoidRoad,
  routeResult,
  activeStepIndex,
  mapPickTarget,
  errorText,
  isLoading,
  onSelectFrom,
  onSelectTo,
  onSwapPlaces,
  onChangeMode,
  onToggleAvoidRoad,
  onChangeMapPickTarget,
  onSelectStep,
  onApplyPreset,
}) => {
  const [fromQuery, setFromQuery] = useState<string>(fromPlace?.name || '');
  const [toQuery, setToQuery] = useState<string>(toPlace?.name || '');
  const [fromResults, setFromResults] = useState<PlaceSummary[]>([]);
  const [toResults, setToResults] = useState<PlaceSummary[]>([]);
  const [focusedInput, setFocusedInput] = useState<'FROM' | 'TO' | null>(null);

  useEffect(() => {
    setFromQuery(fromPlace ? fromPlace.name : '');
  }, [fromPlace]);

  useEffect(() => {
    setToQuery(toPlace ? toPlace.name : '');
  }, [toPlace]);

  // 300ms 디바운스 자동완성 (출발지)
  useEffect(() => {
    if (focusedInput !== 'FROM') return;
    const trimmed = fromQuery.trim();
    if (!trimmed) {
      setFromResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await searchPlaces({ q: trimmed, limit: 8 });
        setFromResults(res.items);
      } catch {
        setFromResults([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fromQuery, focusedInput]);

  // 300ms 디바운스 자동완성 (도착지)
  useEffect(() => {
    if (focusedInput !== 'TO') return;
    const trimmed = toQuery.trim();
    if (!trimmed) {
      setToResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await searchPlaces({ q: trimmed, limit: 8 });
        setToResults(res.items);
      } catch {
        setToResults([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [toQuery, focusedInput]);

  const summary = routeResult?.summary;
  const steps = routeResult?.steps || [];
  const segments = routeResult?.segments || [];

  return (
    <aside className="guide-sidebar" aria-label="출발·도착 검색 및 경로 안내 목록">
      {/* 1. 검색 및 옵션 영역 */}
      <div className="sidebar-search-section">
        <div className="preset-row">
          <span className="filter-label">검증 루트</span>
          <span>
          {QUICK_ROUTE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="preset-link"
              onClick={() => onApplyPreset(preset.from, preset.to)}
            >
              {preset.label}
            </button>
          ))}
          </span>
        </div>

        <div className="search-inputs-box">
          {/* 출발지 입력 */}
          <div className="search-field-wrap">
            <div className="search-input-row">
              <span className="search-label" aria-hidden="true">출발</span>
              <input
                type="text"
                className="sharp-input search-input-flex"
                aria-label="출발지 검색"
                aria-autocomplete="list"
                aria-expanded={focusedInput === 'FROM' && fromResults.length > 0}
                placeholder="출발지 검색 (예: 팔정도, 후문, 혜화)"
                value={fromQuery}
                onFocus={() => setFocusedInput('FROM')}
                onBlur={() => window.setTimeout(() => setFocusedInput(null), 180)}
                onChange={(e) => setFromQuery(e.target.value)}
              />
              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  onChangeMapPickTarget(mapPickTarget === 'FROM' ? null : 'FROM')
                }
                aria-pressed={mapPickTarget === 'FROM'}
                title="지도를 클릭하여 가장 가까운 출발지 선택"
              >
                지도선택
              </button>
            </div>

            {focusedInput === 'FROM' && fromResults.length > 0 && (
              <ul className="autocomplete-list" aria-label="장소 검색 결과">
                {fromResults.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="autocomplete-item"
                      onMouseDown={() => {
                        onSelectFrom(item);
                        setFocusedInput(null);
                      }}
                    >
                      <strong>{item.name}</strong>
                      <span className="mono-tag">
                        {formatFloorLabel(item.floor)} · ({item.position.x},{' '}
                        {item.position.y})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 도착지 입력 + 스왑 버튼 */}
          <div className="search-field-wrap">
            <div className="search-input-row">
              <span className="search-label search-label-to" aria-hidden="true">
                도착
              </span>
              <input
                type="text"
                className="sharp-input search-input-flex"
                aria-label="도착지 검색"
                aria-autocomplete="list"
                aria-expanded={focusedInput === 'TO' && toResults.length > 0}
                placeholder="도착지 검색 (예: 신공 41, 경영관)"
                value={toQuery}
                onFocus={() => setFocusedInput('TO')}
                onBlur={() => window.setTimeout(() => setFocusedInput(null), 180)}
                onChange={(e) => setToQuery(e.target.value)}
              />
              <button
                type="button"
                className="text-btn text-btn-icon"
                onClick={onSwapPlaces}
                aria-label="출발지와 도착지 바꾸기"
                title="출발지와 도착지 바꾸기"
              >
                ⇅
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  onChangeMapPickTarget(mapPickTarget === 'TO' ? null : 'TO')
                }
                aria-pressed={mapPickTarget === 'TO'}
                title="지도를 클릭하여 가장 가까운 도착지 선택"
              >
                지도선택
              </button>
            </div>

            {focusedInput === 'TO' && toResults.length > 0 && (
              <ul className="autocomplete-list" aria-label="장소 검색 결과">
                {toResults.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="autocomplete-item"
                      onMouseDown={() => {
                        onSelectTo(item);
                        setFocusedInput(null);
                      }}
                    >
                      <strong>{item.name}</strong>
                      <span className="mono-tag">
                        {formatFloorLabel(item.floor)} · ({item.position.x},{' '}
                        {item.position.y})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 경로 탐색 옵션 (POST /routes options) */}
        <div className="route-options-bar">
          <div className="mode-switcher" role="radiogroup" aria-label="경로 기준">
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'FASTEST'}
              onClick={() => onChangeMode('FASTEST')}
              title="시간이 가장 적게 걸리는 길"
              className={`mode-btn ${
                mode === 'FASTEST' ? 'mode-btn-active' : ''
              }`}
            >
              빠른 길
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'EASIEST'}
              onClick={() => onChangeMode('EASIEST')}
              title="덜 힘든(칼로리가 적게 드는) 길"
              className={`mode-btn ${
                mode === 'EASIEST' ? 'mode-btn-active' : ''
              }`}
            >
              편한 길
            </button>
          </div>

          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={avoidRoad}
              onChange={onToggleAvoidRoad}
            />
            <span>차도 피하기</span>
          </label>
        </div>

        {mapPickTarget && (
          <div className="map-pick-notice" role="status">
            지도 위 원하는 위치를 클릭하면 가장 가까운 장소가{' '}
            <strong>{mapPickTarget === 'FROM' ? '출발지' : '도착지'}</strong>로
            지정됩니다. (`/places/nearest`)
          </div>
        )}

        {errorText && (
          <div className="error-banner" role="alert">
            {errorText}
          </div>
        )}
      </div>

      {/* 2. 경로 요약 및 지름길 강조 배너 */}
      {summary && !errorText && (
        <div className="route-summary-card">
          <div className="summary-top-row">
            <div>
              <span className="summary-time">
                {formatDurationText(summary.totalSeconds)}
              </span>
              <span className="summary-sub">
                ({summary.totalKcal} kcal)
              </span>
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
      )}

      {/* 3. 단계별 안내 목록 (steps) */}
      <div className="steps-list-container">
        <div className="steps-list-header">
          <strong>단계별 이동 안내 ({steps.length}단계)</strong>
          <span className="steps-hint">단계를 누르면 지도 위치로 이동합니다</span>
        </div>

        {isLoading ? (
          <div className="note-box" role="status" aria-live="polite">
            경로를 계산하고 있습니다...
          </div>
        ) : steps.length === 0 ? (
          <div className="note-box">
            출발지와 도착지를 선택하면 단계별 길안내가 표시됩니다.
          </div>
        ) : (
          <ol className="steps-list">
            {steps.map((step) => {
              const isSelected = activeStepIndex === step.index;
              const seg = segments.find((s) => s.index === step.segmentIndex);
              const isShortcutStep = Boolean(seg?.isShortcut);

              return (
                <li key={step.index}>
                  <button
                    type="button"
                    aria-current={isSelected ? 'step' : undefined}
                    onClick={() => onSelectStep(step.index)}
                    className={`step-card-btn ${
                      isSelected ? 'step-card-active' : ''
                    } ${isShortcutStep ? 'step-card-shortcut' : ''}`}
                  >
                    <div className="step-card-top">
                      <span className="route-step-num">{step.index + 1}</span>
                      <span
                        className={`step-action-badge ${
                          isShortcutStep ? 'badge-shortcut' : ''
                        }`}
                      >
                        {ACTION_LABELS[step.action] || step.action}
                      </span>
                      <span className="mono-tag">
                        {formatFloorLabel(step.floor)}
                      </span>
                      {step.seconds !== null && (
                        <span className="step-sec-label">약 {step.seconds}초</span>
                      )}
                    </div>
                    <p className="step-card-text">{step.text}</p>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
};
