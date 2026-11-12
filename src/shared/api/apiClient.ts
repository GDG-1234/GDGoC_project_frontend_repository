import {
  ApiErrorCode,
  ApiErrorResponse,
  BuildingDetailResponse,
  BuildingListResponse,
  MapInfoResponse,
  NearestPlaceResponse,
  PlaceCategory,
  PlaceListResponse,
  RouteRequest,
  RouteResponse,
} from '../types/api';
import {
  calculateMockRoute,
  filterMockPlaces,
  findNearestMockPlace,
  MOCK_BUILDING_DETAILS,
  MOCK_BUILDINGS,
  MOCK_MAP_INFO,
} from '../data/mockApiV1Data';

const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const DEFAULT_USE_MOCK =
  import.meta.env.VITE_USE_MOCK === undefined
    ? true
    : import.meta.env.VITE_USE_MOCK !== 'false';

let runtimeUseMock: boolean = DEFAULT_USE_MOCK;

export function getUseMockMode(): boolean {
  return runtimeUseMock;
}

export function setUseMockMode(useMock: boolean): void {
  runtimeUseMock = useMock;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly debugMessage: string;

  constructor(status: number, code: ApiErrorCode, debugMessage: string) {
    super(getUserFriendlyErrorMessage(code));
    this.status = status;
    this.code = code;
    this.debugMessage = debugMessage;
  }
}

// 규칙 5: error.message는 디버깅용이므로 사용자에게 보여줄 문구는 error.code로 분기한다.
export function getUserFriendlyErrorMessage(code: ApiErrorCode): string {
  switch (code) {
    case 'SAME_PLACE':
      return '출발지와 도착지가 같아요. 서로 다른 장소를 선택해 주세요.';
    case 'PLACE_NOT_FOUND':
      return '선택한 장소를 찾을 수 없어요. 다시 검색해 주세요.';
    case 'BUILDING_NOT_FOUND':
      return '건물 정보를 찾을 수 없어요.';
    case 'NO_ROUTE':
      return '현재 조건으로는 이동 가능한 경로가 없어요. 옵션을 변경해 보세요.';
    case 'VALIDATION_ERROR':
      return '입력값을 다시 확인해 주세요.';
    case 'INTERNAL_ERROR':
    default:
      return '서버와 통신하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
  }
}

async function requestJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${DEFAULT_API_BASE}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(options?.headers || {}),
      },
    });
  } catch (err) {
    throw new ApiClientError(
      500,
      'INTERNAL_ERROR',
      err instanceof Error ? err.message : 'Network error'
    );
  }

  if (!response.ok) {
    let parsedError: ApiErrorResponse | null = null;
    try {
      parsedError = (await response.json()) as ApiErrorResponse;
    } catch {
      // ignore JSON parse failure
    }
    const code: ApiErrorCode = parsedError?.error?.code || 'INTERNAL_ERROR';
    const debugMsg =
      parsedError?.error?.message || `HTTP ${response.status}`;
    throw new ApiClientError(response.status, code, debugMsg);
  }

  return (await response.json()) as T;
}

// 1. GET /map
export async function fetchMapInfo(): Promise<MapInfoResponse> {
  if (runtimeUseMock) {
    return MOCK_MAP_INFO;
  }
  return requestJson<MapInfoResponse>('/map');
}

// 2. GET /places
export async function searchPlaces(params: {
  q: string;
  category?: PlaceCategory;
  buildingId?: number;
  limit?: number;
}): Promise<PlaceListResponse> {
  if (runtimeUseMock) {
    return filterMockPlaces(params);
  }
  const search = new URLSearchParams({ q: params.q });
  if (params.category) search.set('category', params.category);
  if (params.buildingId !== undefined) {
    search.set('buildingId', String(params.buildingId));
  }
  if (params.limit !== undefined) {
    search.set('limit', String(params.limit));
  }
  return requestJson<PlaceListResponse>(`/places?${search.toString()}`);
}

// 3. GET /places/nearest
export async function fetchNearestPlace(params: {
  x: number;
  y: number;
  floor?: number;
}): Promise<NearestPlaceResponse> {
  if (runtimeUseMock) {
    const found = findNearestMockPlace(params);
    if (!found) {
      throw new ApiClientError(
        404,
        'PLACE_NOT_FOUND',
        '해당 층에 등록된 장소가 없습니다.'
      );
    }
    return found;
  }
  const search = new URLSearchParams({
    x: String(Math.round(params.x)),
    y: String(Math.round(params.y)),
  });
  if (params.floor !== undefined) {
    search.set('floor', String(params.floor));
  }
  return requestJson<NearestPlaceResponse>(
    `/places/nearest?${search.toString()}`
  );
}

// 4. POST /routes
export async function calculateRoute(
  body: RouteRequest
): Promise<RouteResponse> {
  if (runtimeUseMock) {
    try {
      return calculateMockRoute(body);
    } catch (err: unknown) {
      const mockErr = err as {
        status?: number;
        code?: ApiErrorCode;
        message?: string;
      };
      throw new ApiClientError(
        mockErr.status || 400,
        mockErr.code || 'INTERNAL_ERROR',
        mockErr.message || 'Mock route error'
      );
    }
  }
  return requestJson<RouteResponse>('/routes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// 5. GET /buildings
export async function fetchBuildings(): Promise<BuildingListResponse> {
  if (runtimeUseMock) {
    return { items: MOCK_BUILDINGS };
  }
  return requestJson<BuildingListResponse>('/buildings');
}

// 6. GET /buildings/{buildingId}
export async function fetchBuildingDetail(
  buildingId: number
): Promise<BuildingDetailResponse> {
  if (runtimeUseMock) {
    const detail = MOCK_BUILDING_DETAILS[buildingId];
    if (!detail) {
      throw new ApiClientError(
        404,
        'BUILDING_NOT_FOUND',
        `존재하지 않는 건물입니다. (buildingId=${buildingId})`
      );
    }
    return detail;
  }
  return requestJson<BuildingDetailResponse>(`/buildings/${buildingId}`);
}

// 층 표기 변환 유틸 (규칙 2: floor: 0 = 실외, 양수 = 1F.., 음수 = B1..)
export function formatFloorLabel(floor: number): string {
  if (floor === 0) return '실외';
  if (floor < 0) return `B${Math.abs(floor)}`;
  return `${floor}F`;
}

// 초(seconds) -> "약 N분" / "약 N분 M초" 변환 유틸
export function formatDurationText(seconds: number): string {
  if (seconds < 60) return `약 ${seconds}초`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (rem === 0) return `약 ${mins}분`;
  return `약 ${mins}분 ${rem}초`;
}
