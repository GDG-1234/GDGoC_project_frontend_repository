import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearMyTimetable,
  createTimetableCourse,
  deleteTimetableCourse,
  fetchMyTimetable,
  TimetableApiError,
  updateTimetableCourse,
} from '../../shared/api/timetableApi';
import { BuildingSummary } from '../../shared/types/api';
import {
  Course,
  CourseInput,
  Day,
  NextCourseResponse,
} from '../../shared/types/timetable';
import { Icon } from '../../shared/ui/Icon';
import {
  NextCourseBanner,
  NextCourseRouteOptions,
} from './NextCourseBanner';
import { TimetablePasteSection } from './TimetablePasteSection';

export const DAY_ORDER: Day[] = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
];

export const DAY_LABELS: Record<Day, string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
};

const HOUR_HEIGHT_PX = 48;

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 9 * 60;
  return h * 60 + m;
}

function getLocationBadge(course: Course): {
  label: string;
  tone: 'floor' | 'building' | 'none';
} {
  if (!course.location) {
    return { label: '위치 미연결', tone: 'none' };
  }
  if (course.location.precision === 'FLOOR' && course.location.floor !== null) {
    return {
      label: `${course.location.floor < 0 ? `B${Math.abs(course.location.floor)}` : course.location.floor}층 안내`,
      tone: 'floor',
    };
  }
  return { label: '건물 안내', tone: 'building' };
}

function formatCourseRoom(course: Course): string {
  const parts: string[] = [];
  if (course.buildingName) parts.push(course.buildingName);
  if (course.roomNumber) parts.push(course.roomNumber);
  if (parts.length > 0) return parts.join(' ');
  if (course.room) return course.room;
  if (course.roomDescription) return course.roomDescription;
  return '강의실 미지정';
}

interface CourseFormState {
  name: string;
  day: Day;
  startTime: string;
  endTime: string;
  buildingName: string;
  roomNumber: string;
  roomDescription: string;
}

const EMPTY_FORM: CourseFormState = {
  name: '',
  day: 'MON',
  startTime: '10:30',
  endTime: '12:00',
  buildingName: '',
  roomNumber: '',
  roomDescription: '',
};

interface TimetablePanelProps {
  isAuthenticated: boolean;
  authLoading: boolean;
  buildings: BuildingSummary[];
  onSignIn: () => void;
  onClose: () => void;
  onOpenRouteOnMap: (
    info: NextCourseResponse,
    options: NextCourseRouteOptions
  ) => void;
}

export const TimetablePanel: React.FC<TimetablePanelProps> = ({
  isAuthenticated,
  authLoading,
  buildings,
  onSignIn,
  onClose,
  onOpenRouteOnMap,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [nextRefreshKey, setNextRefreshKey] = useState<number>(0);
  const [loadStatus, setLoadStatus] = useState<
    'idle' | 'loading' | 'loaded' | 'error'
  >('idle');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // 뷰 전환 & 모바일 요일 선택
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDay, setSelectedDay] = useState<Day>(() => {
    const jsDay = new Date().getDay(); // 0=Sun..6=Sat
    const map: Day[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const today = map[jsDay];
    return today === 'SAT' || today === 'SUN' ? 'MON' : today;
  });

  // 직접 입력 폼 (신규 추가 / 기존 수업 수정)
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isPasteOpen, setIsPasteOpen] = useState<boolean>(false);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editingOriginals, setEditingOriginals] = useState<{
    weeks: string | null;
    room: string | null;
    buildingName: string;
    roomNumber: string;
  } | null>(null);
  const [form, setForm] = useState<CourseFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // 전체 삭제 확인
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);

  const loadTimetable = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setLoadStatus('loading');
    setErrorText(null);
    try {
      const res = await fetchMyTimetable();
      setCourses(res.courses);
      setUpdatedAt(res.updatedAt);
      setLoadStatus('loaded');
      setNextRefreshKey((k) => k + 1);
    } catch (err) {
      setLoadStatus('error');
      setErrorText(
        err instanceof TimetableApiError
          ? err.message
          : '시간표를 불러오지 못했어요.'
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadTimetable();
    } else {
      setCourses([]);
      setUpdatedAt(null);
      setLoadStatus('idle');
      setErrorText(null);
    }
  }, [isAuthenticated, loadTimetable]);

  const visibleDays = useMemo<Day[]>(() => {
    const base: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    if (courses.some((c) => c.day === 'SAT')) base.push('SAT');
    if (courses.some((c) => c.day === 'SUN')) base.push('SUN');
    return base;
  }, [courses]);

  const { startHour, endHour } = useMemo(() => {
    let minH = 9;
    let maxH = 18;
    for (const c of courses) {
      const s = Math.floor(timeToMinutes(c.startTime) / 60);
      const e = Math.ceil(timeToMinutes(c.endTime) / 60);
      if (s < minH) minH = s;
      if (e > maxH) maxH = e;
    }
    return {
      startHour: Math.max(7, minH),
      endHour: Math.min(23, Math.max(minH + 4, maxH)),
    };
  }, [courses]);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h < endHour; h += 1) arr.push(h);
    return arr;
  }, [startHour, endHour]);

  const courseShadeMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const c of courses) {
      const key = c.name.trim();
      if (!map.has(key)) {
        map.set(key, idx % 6);
        idx += 1;
      }
    }
    return map;
  }, [courses]);

  const sortedBuildingNames = useMemo(() => {
    const names = buildings.map((b) => b.name);
    if (form.buildingName && !names.includes(form.buildingName)) {
      return [form.buildingName, ...names];
    }
    return names;
  }, [buildings, form.buildingName]);

  const openCreateForm = () => {
    setIsPasteOpen(false);
    setEditingCourseId(null);
    setEditingOriginals(null);
    setForm({ ...EMPTY_FORM, day: selectedDay });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openPastePanel = () => {
    closeForm();
    setIsPasteOpen((prev) => !prev);
  };

  const openEditForm = (course: Course) => {
    if (course.id === null) return;
    setIsPasteOpen(false);
    setEditingCourseId(course.id);
    setEditingOriginals({
      weeks: course.weeks ?? null,
      room: course.room ?? null,
      buildingName: course.buildingName || '',
      roomNumber: course.roomNumber || '',
    });
    setForm({
      name: course.name,
      day: course.day,
      startTime: course.startTime,
      endTime: course.endTime,
      buildingName: course.buildingName || '',
      roomNumber: course.roomNumber || '',
      roomDescription: course.roomDescription || '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCourseId(null);
    setEditingOriginals(null);
    setFormError(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setFormError('과목명을 입력해 주세요.');
      return;
    }
    if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) {
      setFormError('종료 시간은 시작 시간보다 늦어야 해요.');
      return;
    }

    const nextBuilding = form.buildingName.trim();
    const nextRoomNumber = form.roomNumber.trim();
    const roomFieldsChanged =
      editingOriginals !== null &&
      (nextBuilding !== editingOriginals.buildingName.trim() ||
        nextRoomNumber !== editingOriginals.roomNumber.trim());

    const payload: CourseInput = {
      name: trimmedName,
      day: form.day,
      startTime: form.startTime,
      endTime: form.endTime,
      buildingName: nextBuilding || null,
      roomNumber: nextRoomNumber || null,
      roomDescription: form.roomDescription.trim() || null,
      ...(editingOriginals !== null
        ? {
            weeks: editingOriginals.weeks,
            room: roomFieldsChanged ? null : editingOriginals.room,
          }
        : {}),
    };

    setSaving(true);
    setFormError(null);
    try {
      if (editingCourseId !== null) {
        await updateTimetableCourse(editingCourseId, payload);
      } else {
        await createTimetableCourse(payload);
      }
      closeForm();
      await loadTimetable();
    } catch (err) {
      setFormError(
        err instanceof TimetableApiError
          ? err.message
          : '수업을 저장하지 못했어요.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    setSaving(true);
    setErrorText(null);
    try {
      await deleteTimetableCourse(courseId);
      if (editingCourseId === courseId) {
        closeForm();
      }
      await loadTimetable();
    } catch (err) {
      setErrorText(
        err instanceof TimetableApiError
          ? err.message
          : '수업을 삭제하지 못했어요.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    setSaving(true);
    setErrorText(null);
    try {
      await clearMyTimetable();
      setConfirmClearOpen(false);
      closeForm();
      setCourses([]);
      setUpdatedAt(null);
    } catch (err) {
      setErrorText(
        err instanceof TimetableApiError
          ? err.message
          : '시간표를 비우지 못했어요.'
      );
    } finally {
      setSaving(false);
    }
  };

  const dayCourses = useMemo(
    () =>
      courses
        .filter((c) => c.day === selectedDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [courses, selectedDay]
  );

  return (
    <aside className="artifact timetable-artifact" aria-label="내 시간표">
      <header className="artifact-header">
        <div>
          <h2>내 시간표</h2>
        </div>
        <div className="artifact-header-actions">
          {isAuthenticated && (
            <>
              <button
                type="button"
                className={
                  isPasteOpen
                    ? 'header-search-toggle active'
                    : 'header-search-toggle'
                }
                onClick={openPastePanel}
                disabled={saving}
                title="nDRIMS 엑셀 붙여넣기"
              >
                <Icon name="paste" size={14} />
                <span>엑셀</span>
              </button>
              <button
                type="button"
                className={
                  isFormOpen
                    ? 'header-search-toggle active'
                    : 'header-search-toggle'
                }
                onClick={openCreateForm}
                disabled={saving}
              >
                <Icon name="plus" size={14} />
                <span>수업 추가</span>
              </button>
            </>
          )}
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="시간표 닫기"
          >
            <Icon name="close" />
          </button>
        </div>
      </header>

      <div className="timetable-body">
        {!isAuthenticated ? (
          <div className="timetable-empty-state">
            <span className="timetable-eyebrow">MY TIMETABLE</span>
            <h3>로그인하고 내 시간표를 등록해 보세요</h3>
            <p>
              수업을 등록하면 강의실이 캠퍼스 지도와 자동으로 연결되고, 현재 시간
              기준으로 다음 수업 가는 길까지 바로 안내받을 수 있어요.
            </p>
            <button
              type="button"
              className="google-login-btn"
              disabled={authLoading}
              onClick={onSignIn}
            >
              <span>
                {authLoading ? '로그인 확인 중...' : 'Google 계정으로 로그인'}
              </span>
              <Icon name="arrow" size={16} />
            </button>
          </div>
        ) : (
          <>
            {errorText && (
              <div className="artifact-error-banner" role="alert">
                <div className="artifact-error-copy">
                  <strong>{errorText}</strong>
                </div>
                <button
                  type="button"
                  className="retry-btn"
                  onClick={() => void loadTimetable()}
                >
                  다시 시도
                </button>
              </div>
            )}

            <NextCourseBanner
              refreshKey={nextRefreshKey}
              hasCourses={courses.length > 0}
              onOpenRouteOnMap={onOpenRouteOnMap}
            />

            {isPasteOpen && (
              <TimetablePasteSection
                existingCount={courses.length}
                existingStatus={loadStatus}
                onSaved={loadTimetable}
                onClose={() => setIsPasteOpen(false)}
              />
            )}

            {isFormOpen && (
              <form className="timetable-form" onSubmit={handleSubmitForm}>
                <div className="timetable-form-head">
                  <strong>
                    {editingCourseId !== null ? '수업 수정' : '새 수업 추가'}
                  </strong>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={closeForm}
                    aria-label="입력 폼 닫기"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>

                {formError && (
                  <p className="timetable-form-error" role="alert">
                    {formError}
                  </p>
                )}

                <label className="timetable-field">
                  <span>과목명 *</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="예: 소프트웨어공학"
                    maxLength={100}
                    required
                  />
                </label>

                <div className="timetable-field-row timetable-field-row-3">
                  <label className="timetable-field">
                    <span>요일 *</span>
                    <select
                      value={form.day}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          day: e.target.value as Day,
                        }))
                      }
                    >
                      {DAY_ORDER.map((d) => (
                        <option key={d} value={d}>
                          {DAY_LABELS[d]}요일
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="timetable-field">
                    <span>시작 *</span>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          startTime: e.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="timetable-field">
                    <span>종료 *</span>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          endTime: e.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                </div>

                <div className="timetable-field-row">
                  <label className="timetable-field">
                    <span>건물 (길안내 연결)</span>
                    <select
                      value={form.buildingName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          buildingName: e.target.value,
                        }))
                      }
                    >
                      <option value="">선택 안 함</option>
                      {sortedBuildingNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="timetable-field">
                    <span>호실</span>
                    <input
                      type="text"
                      value={form.roomNumber}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          roomNumber: e.target.value,
                        }))
                      }
                      placeholder="예: 5145"
                    />
                  </label>
                </div>

                <label className="timetable-field">
                  <span>강의실 메모 (선택)</span>
                  <input
                    type="text"
                    value={form.roomDescription}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        roomDescription: e.target.value,
                      }))
                    }
                    placeholder="예: 실습실, 교수님 연구실 옆"
                  />
                </label>

                <div className="timetable-form-actions">
                  {editingCourseId !== null && (
                    <button
                      type="button"
                      className="timetable-btn-danger-ghost"
                      disabled={saving}
                      onClick={() => void handleDeleteCourse(editingCourseId)}
                    >
                      삭제
                    </button>
                  )}
                  <div className="timetable-form-actions-right">
                    <button
                      type="button"
                      className="timetable-btn-secondary"
                      onClick={closeForm}
                      disabled={saving}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="timetable-btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? '저장 중...'
                        : editingCourseId !== null
                        ? '수정 저장'
                        : '수업 등록'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="timetable-toolbar">
              <div className="timetable-toolbar-meta">
                <strong>등록된 수업 {courses.length}개</strong>
                {updatedAt && (
                  <span>
                    업데이트 {new Date(updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
              <div className="timetable-toolbar-actions">
                <div
                  className="timetable-view-switch desktop-only-flex"
                  role="group"
                  aria-label="시간표 보기 방식"
                >
                  <button
                    type="button"
                    className={viewMode === 'grid' ? 'active' : ''}
                    onClick={() => setViewMode('grid')}
                  >
                    주간표
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'list' ? 'active' : ''}
                    onClick={() => setViewMode('list')}
                  >
                    목록
                  </button>
                </div>
                {courses.length > 0 && (
                  <button
                    type="button"
                    className="timetable-text-btn"
                    onClick={() => setConfirmClearOpen(true)}
                    disabled={saving}
                  >
                    전체 비우기
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="timetable-loading">시간표를 불러오는 중...</div>
            ) : courses.length === 0 ? (
              <div className="timetable-empty-state compact">
                <h3>아직 등록된 수업이 없어요</h3>
                <p>
                  수업을 하나씩 직접 추가하거나, nDRIMS 시간표 엑셀을 복사해
                  한 번에 불러올 수 있어요.
                </p>
                <div className="timetable-empty-actions">
                  <button
                    type="button"
                    className="timetable-btn-primary"
                    onClick={openCreateForm}
                  >
                    수업 직접 추가
                  </button>
                  <button
                    type="button"
                    className="timetable-btn-secondary"
                    onClick={() => {
                      closeForm();
                      setIsPasteOpen(true);
                    }}
                  >
                    nDRIMS 엑셀 붙여넣기
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* PC 주간 시간표 그리드 */}
                <div
                  className={
                    viewMode === 'grid'
                      ? 'timetable-grid-wrap'
                      : 'timetable-grid-wrap is-hidden'
                  }
                >
                  <div
                    className="timetable-grid-header"
                    style={{
                      gridTemplateColumns: `42px repeat(${visibleDays.length}, minmax(0, 1fr))`,
                    }}
                  >
                    <span />
                    {visibleDays.map((day) => (
                      <strong key={day}>{DAY_LABELS[day]}</strong>
                    ))}
                  </div>
                  <div
                    className="timetable-grid-body"
                    style={{
                      gridTemplateColumns: `42px repeat(${visibleDays.length}, minmax(0, 1fr))`,
                      height: `${hours.length * HOUR_HEIGHT_PX}px`,
                    }}
                  >
                    <div className="timetable-time-col">
                      {hours.map((h) => (
                        <div
                          key={h}
                          className="timetable-time-slot"
                          style={{ height: `${HOUR_HEIGHT_PX}px` }}
                        >
                          {String(h).padStart(2, '0')}
                        </div>
                      ))}
                    </div>

                    {visibleDays.map((day) => {
                      const items = courses.filter((c) => c.day === day);
                      return (
                        <div key={day} className="timetable-day-col">
                          {hours.map((h) => (
                            <div
                              key={h}
                              className="timetable-hour-cell"
                              style={{ height: `${HOUR_HEIGHT_PX}px` }}
                            />
                          ))}
                          {items.map((course, idx) => {
                            const startMin = timeToMinutes(course.startTime);
                            const endMin = timeToMinutes(course.endTime);
                            const top =
                              ((startMin - startHour * 60) / 60) *
                              HOUR_HEIGHT_PX;
                            const height = Math.max(
                              28,
                              ((endMin - startMin) / 60) * HOUR_HEIGHT_PX - 2
                            );
                            const shadeIdx =
                              courseShadeMap.get(course.name.trim()) ?? 0;
                            return (
                              <button
                                key={course.id ?? `${day}-${idx}`}
                                type="button"
                                className={`timetable-course-block shade-${shadeIdx}`}
                                style={{ top: `${top}px`, height: `${height}px` }}
                                onClick={() => openEditForm(course)}
                                title={`${course.name} (${course.startTime}~${course.endTime}) · ${formatCourseRoom(course)}`}
                              >
                                <strong className="timetable-block-name">
                                  {course.name}
                                </strong>
                                <span className="timetable-block-room">
                                  {formatCourseRoom(course)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 모바일 기본 뷰 & PC 목록 뷰 */}
                <div
                  className={
                    viewMode === 'list'
                      ? 'timetable-list-wrap force-show'
                      : 'timetable-list-wrap'
                  }
                >
                  <div className="timetable-day-tabs" role="tablist">
                    {DAY_ORDER.map((day) => {
                      const count = courses.filter((c) => c.day === day).length;
                      if (
                        (day === 'SAT' || day === 'SUN') &&
                        count === 0 &&
                        selectedDay !== day
                      ) {
                        return null;
                      }
                      return (
                        <button
                          key={day}
                          type="button"
                          role="tab"
                          aria-selected={selectedDay === day}
                          className={
                            selectedDay === day
                              ? 'timetable-day-tab active'
                              : 'timetable-day-tab'
                          }
                          onClick={() => setSelectedDay(day)}
                        >
                          <span>{DAY_LABELS[day]}</span>
                          {count > 0 && <small>{count}</small>}
                        </button>
                      );
                    })}
                  </div>

                  {dayCourses.length === 0 ? (
                    <p className="timetable-day-empty">
                      {DAY_LABELS[selectedDay]}요일에는 등록된 수업이 없어요.
                    </p>
                  ) : (
                    <ul className="timetable-course-list">
                      {dayCourses.map((course, idx) => {
                        const badge = getLocationBadge(course);
                        return (
                          <li
                            key={course.id ?? `${course.day}-${idx}`}
                            className="timetable-course-row"
                          >
                            <div className="timetable-course-row-main">
                              <span className="timetable-course-time">
                                {course.startTime} ~ {course.endTime}
                              </span>
                              <strong>{course.name}</strong>
                              <div className="timetable-course-meta">
                                <span>{formatCourseRoom(course)}</span>
                                <span
                                  className={`timetable-loc-badge tone-${badge.tone}`}
                                >
                                  {badge.label}
                                </span>
                              </div>
                            </div>
                            {course.id !== null && (
                              <div className="timetable-course-row-actions">
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => openEditForm(course)}
                                  aria-label={`${course.name} 수정`}
                                  title="수정"
                                >
                                  <Icon name="edit" size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() =>
                                    void handleDeleteCourse(course.id!)
                                  }
                                  aria-label={`${course.name} 삭제`}
                                  title="삭제"
                                >
                                  <Icon name="trash" size={16} />
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}

            {confirmClearOpen && (
              <div
                className="confirm-modal-backdrop"
                role="presentation"
                onClick={() => setConfirmClearOpen(false)}
              >
                <div
                  className="confirm-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="clear-tt-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 id="clear-tt-title">시간표를 모두 비울까요?</h3>
                  <p>
                    등록된 수업 {courses.length}개가 모두 삭제되며 되돌릴 수
                    없어요.
                  </p>
                  <div className="confirm-modal-actions">
                    <button
                      type="button"
                      className="confirm-btn-cancel"
                      onClick={() => setConfirmClearOpen(false)}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="confirm-btn-danger"
                      disabled={saving}
                      onClick={() => void handleClearAll()}
                    >
                      {saving ? '삭제 중...' : '전체 삭제'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
