import React, { useCallback, useEffect, useState } from 'react';
import { formatDurationText, searchPlaces } from '../../shared/api/apiClient';
import {
  fetchNextCourse,
  TimetableApiError,
} from '../../shared/api/timetableApi';
import { PlaceSummary, RouteMode } from '../../shared/types/api';
import { NextCourseResponse } from '../../shared/types/timetable';
import { Icon } from '../../shared/ui/Icon';

interface NextCourseBannerProps {
  refreshKey: number;
  hasCourses: boolean;
  onOpenRouteOnMap: (info: NextCourseResponse) => void;
}

function getOriginSourceLabel(
  source: 'REQUEST' | 'CURRENT_CLASS' | 'PREVIOUS_CLASS'
): string {
  switch (source) {
    case 'CURRENT_CLASS':
      return '현재 수업 위치 기준';
    case 'PREVIOUS_CLASS':
      return '직전 수업 위치 기준';
    case 'REQUEST':
    default:
      return '직접 선택한 출발지';
  }
}

function getRouteErrorLabel(code: string): string {
  switch (code) {
    case 'SAME_PLACE':
      return '출발지와 다음 수업 강의실이 같은 건물이에요.';
    case 'NO_LOCATION':
      return '강의실 건물 정보가 연결되지 않아 경로를 계산할 수 없어요. 수업을 눌러 건물을 지정해 주세요.';
    case 'NO_ROUTE':
      return '해당 구간 경로를 찾지 못했어요. 다른 출발지를 선택해 보세요.';
    default:
      return '경로를 계산할 수 없어요.';
  }
}

export const NextCourseBanner: React.FC<NextCourseBannerProps> = ({
  refreshKey,
  hasCourses,
  onOpenRouteOnMap,
}) => {
  const [nextInfo, setNextInfo] = useState<NextCourseResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [mode, setMode] = useState<RouteMode>('FASTEST');
  const [avoidStairs, setAvoidStairs] = useState<boolean>(false);
  const [selectedOrigin, setSelectedOrigin] = useState<PlaceSummary | null>(
    null
  );

  // 출발지 검색 UI
  const [originPickerOpen, setOriginPickerOpen] = useState<boolean>(false);
  const [originQuery, setOriginQuery] = useState<string>('');
  const [originResults, setOriginResults] = useState<PlaceSummary[]>([]);
  const [searchingOrigin, setSearchingOrigin] = useState<boolean>(false);

  const loadNext = useCallback(async () => {
    if (!hasCourses) {
      setNextInfo(null);
      return;
    }
    setLoading(true);
    setErrorText(null);
    try {
      const res = await fetchNextCourse({
        fromPlaceId: selectedOrigin?.id,
        mode,
        avoidStairs,
      });
      setNextInfo(res);
    } catch (err) {
      setErrorText(
        err instanceof TimetableApiError
          ? err.message
          : '다음 수업 정보를 불러오지 못했어요.'
      );
    } finally {
      setLoading(false);
    }
  }, [hasCourses, selectedOrigin?.id, mode, avoidStairs]);

  useEffect(() => {
    void loadNext();
  }, [loadNext, refreshKey]);

  const needsOrigin =
    Boolean(nextInfo?.next) &&
    !nextInfo?.origin &&
    !nextInfo?.route &&
    !nextInfo?.routeError;

  const isOriginSearchVisible = originPickerOpen || needsOrigin;

  useEffect(() => {
    const q = originQuery.trim();
    if (!isOriginSearchVisible || !q) {
      setOriginResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchingOrigin(true);
      void searchPlaces({ q, limit: 8 })
        .then((res) => {
          if (!cancelled) setOriginResults(res.items);
        })
        .catch(() => {
          if (!cancelled) setOriginResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchingOrigin(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [originQuery, isOriginSearchVisible]);

  if (!hasCourses) return null;

  return (
    <section className="next-course-card" aria-label="다음 수업 길안내">
      <div className="next-course-head">
        <span className="next-course-eyebrow">NEXT CLASS ROUTE</span>
        <button
          type="button"
          className="timetable-text-btn"
          onClick={() => void loadNext()}
          disabled={loading}
        >
          {loading ? '갱신 중...' : '새로고침'}
        </button>
      </div>

      {errorText ? (
        <p className="timetable-form-error" role="alert">
          {errorText}
        </p>
      ) : loading && !nextInfo ? (
        <p className="next-course-message">다음 수업과 경로를 계산하고 있어요...</p>
      ) : nextInfo ? (
        <>
          <p className="next-course-message">{nextInfo.message}</p>

          {nextInfo.next && (
            <div className="next-course-options">
              <div className="next-course-option-pills" role="group" aria-label="경로 옵션">
                <button
                  type="button"
                  className={mode === 'FASTEST' ? 'option-chip active' : 'option-chip'}
                  onClick={() => setMode('FASTEST')}
                >
                  빠른 길
                </button>
                <button
                  type="button"
                  className={mode === 'EASIEST' ? 'option-chip active' : 'option-chip'}
                  onClick={() => setMode('EASIEST')}
                >
                  편한 길
                </button>
                <button
                  type="button"
                  className={avoidStairs ? 'option-chip active' : 'option-chip'}
                  aria-pressed={avoidStairs}
                  onClick={() => setAvoidStairs((prev) => !prev)}
                >
                  계단 피하기
                </button>
              </div>

              <div className="next-course-origin-row">
                {nextInfo.origin ? (
                  <span className="next-course-origin-label">
                    출발: <strong>{nextInfo.origin.placeName}</strong> (
                    {getOriginSourceLabel(nextInfo.origin.source)})
                  </span>
                ) : (
                  <span className="next-course-origin-label">
                    출발지를 고르면 경로를 바로 계산해 드려요.
                  </span>
                )}
                {!needsOrigin && (
                  <button
                    type="button"
                    className="timetable-text-btn"
                    onClick={() => setOriginPickerOpen((prev) => !prev)}
                  >
                    {originPickerOpen ? '닫기' : '출발지 변경'}
                  </button>
                )}
              </div>

              {isOriginSearchVisible && (
                <div className="next-course-origin-picker">
                  <div className="next-course-origin-input-wrap">
                    <Icon name="search" size={15} />
                    <input
                      type="text"
                      value={originQuery}
                      onChange={(e) => setOriginQuery(e.target.value)}
                      placeholder="출발 장소 검색 (예: 정문, 혜화관, 상록원)"
                      aria-label="다음 수업 출발 장소 검색"
                    />
                    {selectedOrigin && (
                      <button
                        type="button"
                        className="timetable-text-btn"
                        onClick={() => {
                          setSelectedOrigin(null);
                          setOriginQuery('');
                          setOriginResults([]);
                        }}
                      >
                        자동
                      </button>
                    )}
                  </div>
                  {searchingOrigin && (
                    <span className="next-course-search-hint">검색 중...</span>
                  )}
                  {originResults.length > 0 && (
                    <ul className="next-course-origin-results">
                      {originResults.map((place) => (
                        <li key={place.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrigin(place);
                              setOriginQuery('');
                              setOriginResults([]);
                              setOriginPickerOpen(false);
                            }}
                          >
                            <strong>{place.name}</strong>
                            {place.buildingName &&
                              place.buildingName !== place.name && (
                                <small>{place.buildingName}</small>
                              )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {nextInfo.routeError && (
                <p className="next-course-route-note">
                  {getRouteErrorLabel(nextInfo.routeError)}
                </p>
              )}

              {nextInfo.route && (
                <button
                  type="button"
                  className="next-course-map-cta"
                  onClick={() => onOpenRouteOnMap(nextInfo)}
                >
                  <Icon name="map" size={16} />
                  <span>
                    지도에서 경로 보기 ·{' '}
                    {formatDurationText(nextInfo.route.summary.totalSeconds)}
                  </span>
                  <Icon name="arrow" size={16} />
                </button>
              )}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
};
