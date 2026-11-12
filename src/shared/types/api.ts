// ============================================================================
// 공식 API v1 TypeScript 인터페이스 정의
// ============================================================================

export type PlaceCategory =
  | 'BUILDING'
  | 'ENTRANCE'
  | 'CLASSROOM'
  | 'LIBRARY'
  | 'CAFETERIA'
  | 'FACILITY'
  | 'LANDMARK';

export interface Point {
  x: number;
  y: number;
  z?: number; // v2(3D) 대비 확장 필드
}

export interface PlaceSummary {
  id: number;
  name: string;
  category: PlaceCategory;
  buildingId: number | null;
  buildingName: string | null;
  floor: number; // 0 = 실외, -1 = 지하1층(B1)
  position: Point;
}

export type RouteMode = 'FASTEST' | 'EASIEST';

export type EdgeType =
  | 'FLAT'
  | 'STAIRS_UP'
  | 'STAIRS_DOWN'
  | 'UPHILL'
  | 'DOWNHILL'
  | 'ELEVATOR';

export type StepAction =
  | 'START'
  | 'WALK'
  | 'ENTER_BUILDING'
  | 'EXIT_BUILDING'
  | 'STAIRS_UP'
  | 'STAIRS_DOWN'
  | 'ELEVATOR'
  | 'UPHILL'
  | 'DOWNHILL'
  | 'ARRIVE';

export interface RoutePoint {
  nodeId: number;
  x: number;
  y: number;
  z?: number;
}

export interface RouteSegment {
  index: number;
  indoor: boolean;
  buildingId: number | null;
  floor: number;
  floorImageUrl: string | null;
  isShortcut: boolean;
  name: string | null;
  points: RoutePoint[];
}

export interface RouteStep {
  index: number;
  action: StepAction;
  text: string;
  position: Point;
  segmentIndex: number;
  floor: number;
  seconds: number | null;
}

export interface MapInfoResponse {
  imageUrl: string;
  width: number;
  height: number;
  defaultCenter: Point;
  minZoom: number;
  maxZoom: number;
}

export interface PlaceListResponse {
  items: PlaceSummary[];
}

export interface NearestPlaceResponse {
  place: PlaceSummary;
  distancePx: number;
}

export interface RouteRequest {
  from: { placeId: number };
  to: { placeId: number };
  options?: {
    mode?: RouteMode;
    avoidRoad?: boolean;
    avoidStairs?: boolean;
    compare?: boolean;
  };
}

export interface RouteSummary {
  from: { id: number; name: string };
  to: { id: number; name: string };
  totalSeconds: number;
  totalKcal: number;
  floorChanges: number;
  usesRoad: boolean;
  usesShortcut: boolean;
  savedSeconds: number | null;
}

export interface RouteResponse {
  summary: RouteSummary;
  segments: RouteSegment[];
  steps: RouteStep[];
}

export interface BuildingSummary {
  id: number;
  name: string;
  aliases: string[];
  position: Point;
  thumbnailUrl: string | null;
}

export interface BuildingListResponse {
  items: BuildingSummary[];
}

export type FacilityType =
  | 'VENDING'
  | 'PRINTER'
  | 'ATM'
  | 'STORE'
  | 'CAFE'
  | 'LOUNGE'
  | 'SHOWER'
  | 'ETC';

export interface BuildingFloorInfo {
  floor: number;
  label: string;
  floorImageUrl: string | null;
}

export interface BuildingFacilityInfo {
  type: FacilityType;
  name: string;
  floorDescription: string;
}

export interface BuildingDetailResponse {
  id: number;
  name: string;
  aliases: string[];
  position: Point;
  photoUrl: string | null;
  phone: string | null;
  operatingHours: string | null;
  floors: BuildingFloorInfo[];
  facilities: BuildingFacilityInfo[];
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'SAME_PLACE'
  | 'PLACE_NOT_FOUND'
  | 'BUILDING_NOT_FOUND'
  | 'NO_ROUTE'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

