import {
  Course,
  CourseInput,
  NextCourseQuery,
  NextCourseResponse,
  ParseTimetableResponse,
  TimetableErrorCode,
  TimetableErrorResponse,
  TimetableResponse,
} from '../types/timetable';
import { getFirebaseIdToken } from './firebaseAuth';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class TimetableApiError extends Error {
  public readonly status: number;
  public readonly code: TimetableErrorCode;
  public readonly debugMessage: string;

  constructor(status: number, code: TimetableErrorCode, debugMessage: string) {
    super(getTimetableErrorMessage(code));
    this.status = status;
    this.code = code;
    this.debugMessage = debugMessage;
  }
}

export function getTimetableErrorMessage(code: TimetableErrorCode): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return '로그인이 필요하거나 세션이 만료되었어요. 다시 로그인해 주세요.';
    case 'VALIDATION_ERROR':
      return '입력값을 확인해 주세요. 과목명, 요일, 시작·종료 시간(종료가 시작보다 늦어야 함)이 올바른지 확인이 필요해요.';
    case 'TOO_MANY_COURSES':
      return '등록할 수 있는 수업 수(최대 100개)를 초과했어요.';
    case 'COURSE_NOT_FOUND':
      return '수업을 찾을 수 없어요. 이미 삭제되었거나 접근할 수 없는 항목입니다.';
    case 'PLACE_NOT_FOUND':
      return '선택한 출발 장소를 찾을 수 없어요. 다른 장소를 골라 주세요.';
    case 'INTERNAL_ERROR':
    default:
      return '시간표 서버와 통신하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
  }
}

async function requestTimetableJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = await getFirebaseIdToken();
  if (!token) {
    throw new TimetableApiError(401, 'UNAUTHORIZED', 'Missing Firebase ID token');
  }

  const url = `${DEFAULT_API_BASE}${path}`;
  let response: Response;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...((options?.headers as Record<string, string> | undefined) || {}),
    };
    if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new TimetableApiError(
      500,
      'INTERNAL_ERROR',
      err instanceof Error ? err.message : 'Network error'
    );
  }

  if (!response.ok) {
    let parsedError: TimetableErrorResponse | null = null;
    try {
      parsedError = (await response.json()) as TimetableErrorResponse;
    } catch {
      // ignore JSON parse failure
    }
    const code: TimetableErrorCode = parsedError?.error?.code || 'INTERNAL_ERROR';
    const debugMsg = parsedError?.error?.message || `HTTP ${response.status}`;
    throw new TimetableApiError(response.status, code, debugMsg);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// GET /timetables/me
export async function fetchMyTimetable(): Promise<TimetableResponse> {
  return requestTimetableJson<TimetableResponse>('/timetables/me');
}

// GET /timetables/me/next
export async function fetchNextCourse(
  query?: NextCourseQuery
): Promise<NextCourseResponse> {
  const params = new URLSearchParams();
  if (query?.fromPlaceId !== undefined) {
    params.set('fromPlaceId', String(query.fromPlaceId));
  }
  if (query?.mode) {
    params.set('mode', query.mode);
  }
  if (query?.avoidStairs !== undefined) {
    params.set('avoidStairs', String(query.avoidStairs));
  }
  const qs = params.toString();
  return requestTimetableJson<NextCourseResponse>(
    qs ? `/timetables/me/next?${qs}` : '/timetables/me/next'
  );
}

// POST /timetables/me/courses
export async function createTimetableCourse(
  input: CourseInput
): Promise<Course> {
  return requestTimetableJson<Course>('/timetables/me/courses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// PUT /timetables/me/courses/{courseId}
export async function updateTimetableCourse(
  courseId: number,
  input: CourseInput
): Promise<Course> {
  return requestTimetableJson<Course>(`/timetables/me/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

// DELETE /timetables/me/courses/{courseId}
export async function deleteTimetableCourse(courseId: number): Promise<void> {
  return requestTimetableJson<void>(`/timetables/me/courses/${courseId}`, {
    method: 'DELETE',
  });
}

// POST /timetables/parse (저장하지 않음, 미리보기용)
export async function parseTimetableText(
  text: string
): Promise<ParseTimetableResponse> {
  return requestTimetableJson<ParseTimetableResponse>('/timetables/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// PUT /timetables/me (기존 시간표 전체 교체)
export async function replaceMyTimetable(
  courses: CourseInput[]
): Promise<TimetableResponse> {
  return requestTimetableJson<TimetableResponse>('/timetables/me', {
    method: 'PUT',
    body: JSON.stringify({ courses }),
  });
}

// DELETE /timetables/me (전체 삭제)
export async function clearMyTimetable(): Promise<void> {
  return requestTimetableJson<void>('/timetables/me', {
    method: 'DELETE',
  });
}
