// ============================================================================
// 내 시간표 & 다음 수업 길안내 API TypeScript 인터페이스 정의
// ============================================================================

import { RouteMode, RouteResponse } from './api';

export type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type TimetableErrorCode =
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_COURSES'
  | 'UNAUTHORIZED'
  | 'COURSE_NOT_FOUND'
  | 'PLACE_NOT_FOUND'
  | 'INTERNAL_ERROR';

export interface TimetableErrorResponse {
  error: {
    code: TimetableErrorCode;
    message: string;
  };
}

export interface CourseInput {
  name: string;
  day: Day;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  buildingName?: string | null;
  roomNumber?: string | null;
  roomDescription?: string | null;
  weeks?: string | null;
  room?: string | null;
}

export interface RoomLocation {
  buildingId: number;
  buildingName: string;
  floor: number | null;
  placeId: number | null;
  placeName: string | null;
  precision: 'FLOOR' | 'BUILDING';
}

export interface Course extends CourseInput {
  id: number | null;
  floor: number | null;
  location: RoomLocation | null;
}

export interface TimetableResponse {
  courses: Course[];
  updatedAt: string | null;
}

export interface ParseTimetableResponse {
  courses: Course[];
  warnings: string[];
}

export type NextCourseOriginSource =
  | 'REQUEST'
  | 'CURRENT_CLASS'
  | 'PREVIOUS_CLASS';

export interface NextCourseOrigin {
  placeId: number;
  placeName: string;
  source: NextCourseOriginSource;
}

export interface NextCourseQuery {
  fromPlaceId?: number;
  mode?: RouteMode;
  avoidStairs?: boolean;
}

export interface NextCourseResponse {
  now: string;
  current: Course | null;
  next: Course | null;
  startsInMinutes: number | null;
  origin: NextCourseOrigin | null;
  route: RouteResponse | null;
  routeError: string | null;
  message: string;
}
