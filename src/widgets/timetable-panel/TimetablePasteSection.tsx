import React, { useState } from 'react';
import {
  parseTimetableText,
  replaceMyTimetable,
  TimetableApiError,
} from '../../shared/api/timetableApi';
import { Course, CourseInput } from '../../shared/types/timetable';
import { Icon } from '../../shared/ui/Icon';
import { DAY_LABELS } from './TimetablePanel';

interface TimetablePasteSectionProps {
  existingCount: number;
  onSaved: () => Promise<void>;
  onClose: () => void;
}

function toCourseInput(course: Course): CourseInput {
  return {
    name: course.name,
    day: course.day,
    startTime: course.startTime,
    endTime: course.endTime,
    buildingName: course.buildingName ?? null,
    roomNumber: course.roomNumber ?? null,
    roomDescription: course.roomDescription ?? null,
    weeks: course.weeks ?? null,
    room: course.room ?? null,
  };
}

export const TimetablePasteSection: React.FC<TimetablePasteSectionProps> = ({
  existingCount,
  onSaved,
  onClose,
}) => {
  const [rawText, setRawText] = useState<string>('');
  const [parsing, setParsing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [parsedCourses, setParsedCourses] = useState<Course[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleParse = async () => {
    if (!rawText.trim()) {
      setErrorText('엑셀에서 복사한 시간표 내용을 붙여넣어 주세요.');
      return;
    }
    setParsing(true);
    setErrorText(null);
    try {
      // 탭·줄바꿈·따옴표를 가공하지 않고 원문 그대로 전송
      const res = await parseTimetableText(rawText);
      setParsedCourses(res.courses);
      setWarnings(res.warnings || []);
    } catch (err) {
      setErrorText(
        err instanceof TimetableApiError
          ? err.message
          : '붙여넣은 시간표를 읽지 못했어요.'
      );
    } finally {
      setParsing(false);
    }
  };

  const handleRemovePreviewItem = (index: number) => {
    setParsedCourses((prev) =>
      prev ? prev.filter((_, idx) => idx !== index) : prev
    );
  };

  const handleSaveAll = async () => {
    if (!parsedCourses || parsedCourses.length === 0) return;
    setSaving(true);
    setErrorText(null);
    try {
      await replaceMyTimetable(parsedCourses.map(toCourseInput));
      await onSaved();
      onClose();
    } catch (err) {
      setErrorText(
        err instanceof TimetableApiError
          ? err.message
          : '시간표를 저장하지 못했어요.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="timetable-paste-panel" aria-label="nDRIMS 엑셀 붙여넣기">
      <div className="timetable-form-head">
        <strong>nDRIMS 엑셀 붙여넣기</strong>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="엑셀 붙여넣기 닫기"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <p className="timetable-paste-guide">
        nDRIMS 로그인 → <b>수업/강의평가</b> → <b>개인강의 시간표조회</b> →{' '}
        <b>톱니바퀴(설정)</b>에서 엑셀로 다운로드한 뒤, 전체 선택(Ctrl+A)이나
        과목 목록이 아니라 <b>09:00-09:30 시간 열과 월~금 요일 칸이 있는 격자형
        시간표 영역만</b> 드래그해 복사·붙여넣기해 주세요.
      </p>

      {errorText && (
        <p className="timetable-form-error" role="alert">
          {errorText}
        </p>
      )}

      <textarea
        className="timetable-paste-textarea"
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          if (parsedCourses !== null) {
            setParsedCourses(null);
            setWarnings([]);
          }
        }}
        placeholder="여기에 엑셀에서 복사한 시간표를 그대로 붙여넣으세요 (Ctrl+V)"
        maxLength={50000}
        rows={5}
        disabled={parsing || saving}
      />

      <div className="timetable-paste-actions">
        <button
          type="button"
          className="timetable-btn-secondary"
          onClick={onClose}
          disabled={parsing || saving}
        >
          취소
        </button>
        <button
          type="button"
          className="timetable-btn-primary"
          onClick={() => void handleParse()}
          disabled={parsing || saving || !rawText.trim()}
        >
          {parsing ? '읽는 중...' : '미리보기 확인'}
        </button>
      </div>

      {parsedCourses !== null && (
        <div className="timetable-preview-box">
          <div className="timetable-preview-head">
            <strong>미리보기 ({parsedCourses.length}개 수업)</strong>
            <span>저장 전 제외할 수업은 ×로 뺄 수 있어요</span>
          </div>

          {warnings.length > 0 && (
            <ul className="timetable-warning-list" role="status">
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          )}

          {parsedCourses.length === 0 ? (
            <p className="timetable-day-empty">
              인식된 수업이 없어요. 시간 열과 요일 칸을 함께 드래그해 다시
              복사해 보세요.
            </p>
          ) : (
            <>
              <ul className="timetable-preview-list">
                {parsedCourses.map((course, idx) => (
                  <li key={`${course.day}-${course.startTime}-${idx}`}>
                    <div className="timetable-preview-item-main">
                      <span className="timetable-preview-day">
                        {DAY_LABELS[course.day]} {course.startTime}~
                        {course.endTime}
                      </span>
                      <strong>{course.name}</strong>
                      <small>
                        {[course.buildingName, course.roomNumber]
                          .filter(Boolean)
                          .join(' ') ||
                          course.room ||
                          '강의실 미지정'}
                        {course.location
                          ? ` · ${
                              course.location.precision === 'FLOOR' &&
                              course.location.floor !== null
                                ? `${course.location.floor}층 연결`
                                : '건물 연결'
                            }`
                          : ' · 위치 미연결'}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleRemovePreviewItem(idx)}
                      aria-label={`${course.name} 미리보기에서 제외`}
                      disabled={saving}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {existingCount > 0 && (
                <p className="timetable-replace-notice">
                  등록하면 기존에 저장된 수업 {existingCount}개가 새 시간표로
                  교체됩니다.
                </p>
              )}

              <div className="timetable-paste-actions">
                <button
                  type="button"
                  className="timetable-btn-accent"
                  onClick={() => void handleSaveAll()}
                  disabled={saving}
                >
                  {saving
                    ? '일괄 등록 중...'
                    : `이 시간표로 일괄 등록 (${parsedCourses.length}개)`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};
