import {
  BuildingDetailResponse,
  BuildingSummary,
  MapInfoResponse,
  NearestPlaceResponse,
  PlaceListResponse,
  PlaceSummary,
  RouteRequest,
  RouteResponse,
} from '../types/api';

// 1. GET /map 기본 응답
export const MOCK_MAP_INFO: MapInfoResponse = {
  imageUrl: '/static/map/campus.webp',
  width: 3000,
  height: 5333,
  defaultCenter: { x: 1100, y: 2600 },
  minZoom: -3,
  maxZoom: 1,
};

// 2. 건물 목록 및 상세 데이터
export const MOCK_BUILDINGS: BuildingSummary[] = [
  {
    id: 1,
    name: '명진관',
    aliases: ['명진', 'M동'],
    position: { x: 1120, y: 2380 },
    thumbnailUrl: '/static/building/myungjin.png',
  },
  {
    id: 2,
    name: '중앙도서관',
    aliases: ['중도', '도서관'],
    position: { x: 910, y: 2260 },
    thumbnailUrl: '/static/building/library.png',
  },
  {
    id: 3,
    name: '신공학관',
    aliases: ['신공', 'E동'],
    position: { x: 482, y: 2525 },
    thumbnailUrl: '/static/building/shingong.png',
  },
  {
    id: 4,
    name: '정보문화관P',
    aliases: ['정문관', '정보문화관', 'P동'],
    position: { x: 390, y: 2680 },
    thumbnailUrl: '/static/building/jeongbo_p.png',
  },
  {
    id: 5,
    name: '혜화관',
    aliases: ['혜화', 'H동'],
    position: { x: 1420, y: 2820 },
    thumbnailUrl: '/static/building/hyehwa.png',
  },
  {
    id: 6,
    name: '경영관',
    aliases: ['경영', 'L동'],
    position: { x: 1640, y: 2740 },
    thumbnailUrl: '/static/building/kyungyoung.png',
  },
  {
    id: 7,
    name: '사회과학관',
    aliases: ['사과관', '사회과학'],
    position: { x: 1530, y: 2890 },
    thumbnailUrl: '/static/building/social.png',
  },
  {
    id: 8,
    name: '학술문화관',
    aliases: ['학술관', '문화관', 'K동'],
    position: { x: 1760, y: 2680 },
    thumbnailUrl: '/static/building/haksul.png',
  },
];

export const MOCK_BUILDING_DETAILS: Record<number, BuildingDetailResponse> = {
  1: {
    id: 1,
    name: '명진관',
    aliases: ['명진', 'M동'],
    position: { x: 1120, y: 2380 },
    photoUrl: '/static/infophoto/myungjin.png',
    phone: '02-2260-3114',
    operatingHours: '07:00 ~ 22:00',
    floors: [
      { floor: -1, label: 'B1', floorImageUrl: null },
      { floor: 1, label: '1F', floorImageUrl: '/static/floor/myungjin_1.png' },
      { floor: 2, label: '2F', floorImageUrl: '/static/floor/myungjin_2.png' },
      { floor: 3, label: '3F', floorImageUrl: null },
      { floor: 4, label: '4F', floorImageUrl: null },
    ],
    facilities: [
      { type: 'PRINTER', name: '프린터', floorDescription: '1층 로비' },
      { type: 'VENDING', name: '자판기', floorDescription: '1층, 지하 1층' },
    ],
  },
  2: {
    id: 2,
    name: '중앙도서관',
    aliases: ['중도', '도서관'],
    position: { x: 910, y: 2260 },
    photoUrl: '/static/infophoto/library.png',
    phone: '02-2260-3450',
    operatingHours: '06:00 ~ 23:00 (열람실 상이)',
    floors: [
      { floor: -2, label: 'B2', floorImageUrl: '/static/floor/library_b2.png' },
      { floor: -1, label: 'B1', floorImageUrl: null },
      { floor: 1, label: '1F', floorImageUrl: '/static/floor/library_1.png' },
      { floor: 2, label: '2F', floorImageUrl: null },
      { floor: 3, label: '3F', floorImageUrl: null },
      { floor: 4, label: '4F', floorImageUrl: null },
    ],
    facilities: [
      { type: 'PRINTER', name: '프린터/복사기', floorDescription: 'B2층, 1층' },
      { type: 'CAFE', name: '카페', floorDescription: 'B2층 외부 연결 통로' },
      { type: 'LOUNGE', name: '열람실/라운지', floorDescription: '전 층' },
    ],
  },
  3: {
    id: 3,
    name: '신공학관',
    aliases: ['신공', 'E동'],
    position: { x: 482, y: 2525 },
    photoUrl: '/static/infophoto/shingong.png',
    phone: '02-2260-3800',
    operatingHours: '연중무휴',
    floors: [
      { floor: -1, label: 'B1', floorImageUrl: null },
      { floor: 1, label: '1F', floorImageUrl: '/static/floor/shingong_1.png' },
      { floor: 2, label: '2F', floorImageUrl: null },
      { floor: 3, label: '3F', floorImageUrl: '/static/floor/shingong_3.png' },
      { floor: 4, label: '4F', floorImageUrl: '/static/floor/shingong_4.png' },
      { floor: 5, label: '5F', floorImageUrl: null },
      { floor: 6, label: '6F', floorImageUrl: null },
      { floor: 7, label: '7F', floorImageUrl: null },
      { floor: 8, label: '8F', floorImageUrl: null },
      { floor: 9, label: '9F', floorImageUrl: '/static/floor/shingong_9.png' },
    ],
    facilities: [
      { type: 'PRINTER', name: '프린터', floorDescription: '2층, 3층' },
      { type: 'VENDING', name: '자판기', floorDescription: '1층, 4층' },
      { type: 'ATM', name: 'ATM', floorDescription: '1층 로비' },
    ],
  },
  4: {
    id: 4,
    name: '정보문화관P',
    aliases: ['정문관', '정보문화관', 'P동'],
    position: { x: 390, y: 2680 },
    photoUrl: '/static/infophoto/jeongbo_p.png',
    phone: '02-2260-3812',
    operatingHours: '07:00 ~ 22:00',
    floors: [
      { floor: 1, label: '1F', floorImageUrl: '/static/floor/jeongbo_1.png' },
      { floor: 2, label: '2F', floorImageUrl: null },
      { floor: 3, label: '3F', floorImageUrl: null },
      { floor: 4, label: '4F', floorImageUrl: '/static/floor/jeongbo_4.png' },
      { floor: 5, label: '5F', floorImageUrl: null },
    ],
    facilities: [
      { type: 'VENDING', name: '자판기', floorDescription: '1층' },
    ],
  },
  5: {
    id: 5,
    name: '혜화관',
    aliases: ['혜화', 'H동'],
    position: { x: 1420, y: 2820 },
    photoUrl: '/static/infophoto/hyehwa.png',
    phone: '02-2260-3100',
    operatingHours: '07:00 ~ 22:00',
    floors: [
      { floor: 1, label: '1F', floorImageUrl: '/static/floor/hyehwa_1.png' },
      { floor: 2, label: '2F', floorImageUrl: null },
      { floor: 3, label: '3F', floorImageUrl: '/static/floor/hyehwa_3.png' },
      { floor: 4, label: '4F', floorImageUrl: null },
      { floor: 5, label: '5F', floorImageUrl: null },
      { floor: 6, label: '6F', floorImageUrl: null },
    ],
    facilities: [
      { type: 'CAFE', name: '카페', floorDescription: '1층 야외 테라스' },
      { type: 'PRINTER', name: '프린터', floorDescription: '3층 로비' },
    ],
  },
  6: {
    id: 6,
    name: '경영관',
    aliases: ['경영', 'L동'],
    position: { x: 1640, y: 2740 },
    photoUrl: '/static/infophoto/kyungyoung.png',
    phone: '02-2260-3200',
    operatingHours: '07:00 ~ 22:00',
    floors: [
      { floor: -1, label: 'B1', floorImageUrl: null },
      { floor: 1, label: '1F', floorImageUrl: '/static/floor/kyungyoung_1.png' },
      { floor: 2, label: '2F', floorImageUrl: null },
      { floor: 3, label: '3F', floorImageUrl: '/static/floor/kyungyoung_3.png' },
      { floor: 4, label: '4F', floorImageUrl: null },
      { floor: 5, label: '5F', floorImageUrl: null },
    ],
    facilities: [
      { type: 'LOUNGE', name: '학생 라운지', floorDescription: '3층' },
      { type: 'PRINTER', name: '프린터', floorDescription: '2층, 3층' },
    ],
  },
  7: {
    id: 7,
    name: '사회과학관',
    aliases: ['사과관', '사회과학'],
    position: { x: 1530, y: 2890 },
    photoUrl: '/static/infophoto/social.png',
    phone: '02-2260-3300',
    operatingHours: '07:00 ~ 22:00',
    floors: [
      { floor: 1, label: '1F', floorImageUrl: null },
      { floor: 2, label: '2F', floorImageUrl: null },
      { floor: 3, label: '3F', floorImageUrl: '/static/floor/social_3.png' },
      { floor: 4, label: '4F', floorImageUrl: null },
    ],
    facilities: [
      { type: 'VENDING', name: '자판기', floorDescription: '1층' },
    ],
  },
  8: {
    id: 8,
    name: '학술문화관',
    aliases: ['학술관', '문화관', 'K동'],
    position: { x: 1760, y: 2680 },
    photoUrl: '/static/infophoto/haksul.png',
    phone: '02-2260-3400',
    operatingHours: '07:00 ~ 22:00',
    floors: [
      { floor: -1, label: 'B1', floorImageUrl: null },
      { floor: 1, label: '1F', floorImageUrl: '/static/floor/haksul_1.png' },
      { floor: 2, label: '2F', floorImageUrl: '/static/floor/haksul_2.png' },
      { floor: 3, label: '3F', floorImageUrl: null },
    ],
    facilities: [
      { type: 'CAFE', name: '카페', floorDescription: '1층' },
      { type: 'ATM', name: 'ATM', floorDescription: 'B1층' },
    ],
  },
};

// 3. 장소(Place) 목록 — 건물, 층 대표 노드, 강의실(예시), 랜드마크, 출입문 포함
interface MockPlaceWithAliases extends PlaceSummary {
  aliases: string[];
}

export const MOCK_PLACES: MockPlaceWithAliases[] = [
  {
    id: 101,
    name: '팔정도',
    category: 'LANDMARK',
    buildingId: null,
    buildingName: null,
    floor: 0,
    position: { x: 1050, y: 2450 },
    aliases: ['팔정도광장', '불상', '코끼리상'],
  },
  {
    id: 102,
    name: '만해광장',
    category: 'LANDMARK',
    buildingId: null,
    buildingName: null,
    floor: 0,
    position: { x: 1320, y: 2640 },
    aliases: ['만해', '운동장'],
  },
  {
    id: 103,
    name: '정문',
    category: 'ENTRANCE',
    buildingId: null,
    buildingName: null,
    floor: 0,
    position: { x: 1580, y: 3250 },
    aliases: ['장충동정문', '동대입구역'],
  },
  {
    id: 104,
    name: '후문 (충무로역 방향)',
    category: 'ENTRANCE',
    buildingId: null,
    buildingName: null,
    floor: 0,
    position: { x: 340, y: 2360 },
    aliases: ['후문', '충무로', '충무로역'],
  },
  {
    id: 105,
    name: '혜화문 (중문)',
    category: 'ENTRANCE',
    buildingId: null,
    buildingName: null,
    floor: 0,
    position: { x: 1520, y: 3020 },
    aliases: ['중문', '혜화문'],
  },
  {
    id: 10,
    name: '신공학관',
    category: 'BUILDING',
    buildingId: 3,
    buildingName: '신공학관',
    floor: 0,
    position: { x: 482, y: 2525 },
    aliases: ['신공', 'E동'],
  },
  {
    id: 11,
    name: '신공학관 1층',
    category: 'BUILDING',
    buildingId: 3,
    buildingName: '신공학관',
    floor: 1,
    position: { x: 500, y: 2520 },
    aliases: ['신공 1층', '신공1층'],
  },
  {
    id: 12,
    name: '신공학관 4142호',
    category: 'CLASSROOM',
    buildingId: 3,
    buildingName: '신공학관',
    floor: 4,
    position: { x: 520, y: 2540 },
    aliases: ['신공 4142', '4142', '신공 4층'],
  },
  {
    id: 13,
    name: '신공학관 4층',
    category: 'BUILDING',
    buildingId: 3,
    buildingName: '신공학관',
    floor: 4,
    position: { x: 530, y: 2535 },
    aliases: ['신공 4층', '신공4층'],
  },
  {
    id: 14,
    name: '신공학관 9층',
    category: 'BUILDING',
    buildingId: 3,
    buildingName: '신공학관',
    floor: 9,
    position: { x: 560, y: 2510 },
    aliases: ['신공 9층', '신공9층'],
  },
  {
    id: 20,
    name: '명진관',
    category: 'BUILDING',
    buildingId: 1,
    buildingName: '명진관',
    floor: 0,
    position: { x: 1120, y: 2380 },
    aliases: ['명진', 'M동'],
  },
  {
    id: 21,
    name: '명진관 1층',
    category: 'BUILDING',
    buildingId: 1,
    buildingName: '명진관',
    floor: 1,
    position: { x: 1120, y: 2390 },
    aliases: ['명진 1층', '명진1층'],
  },
  {
    id: 30,
    name: '중앙도서관',
    category: 'LIBRARY',
    buildingId: 2,
    buildingName: '중앙도서관',
    floor: 0,
    position: { x: 910, y: 2260 },
    aliases: ['중도', '도서관'],
  },
  {
    id: 31,
    name: '중앙도서관 B2층',
    category: 'LIBRARY',
    buildingId: 2,
    buildingName: '중앙도서관',
    floor: -2,
    position: { x: 895, y: 2280 },
    aliases: ['중도 지하2층', '중도 B2'],
  },
  {
    id: 40,
    name: '정보문화관P',
    category: 'BUILDING',
    buildingId: 4,
    buildingName: '정보문화관P',
    floor: 0,
    position: { x: 390, y: 2680 },
    aliases: ['정문관', '정보문화관', 'P동'],
  },
  {
    id: 50,
    name: '혜화관',
    category: 'BUILDING',
    buildingId: 5,
    buildingName: '혜화관',
    floor: 0,
    position: { x: 1420, y: 2820 },
    aliases: ['혜화', 'H동'],
  },
  {
    id: 51,
    name: '혜화관 3층',
    category: 'BUILDING',
    buildingId: 5,
    buildingName: '혜화관',
    floor: 3,
    position: { x: 1435, y: 2805 },
    aliases: ['혜화 3층', '혜화3층'],
  },
  {
    id: 60,
    name: '경영관',
    category: 'BUILDING',
    buildingId: 6,
    buildingName: '경영관',
    floor: 0,
    position: { x: 1640, y: 2740 },
    aliases: ['경영', 'L동'],
  },
  {
    id: 61,
    name: '경영관 3층',
    category: 'BUILDING',
    buildingId: 6,
    buildingName: '경영관',
    floor: 3,
    position: { x: 1625, y: 2750 },
    aliases: ['경영 3층', '경영3층'],
  },
  {
    id: 80,
    name: '학술문화관',
    category: 'BUILDING',
    buildingId: 8,
    buildingName: '학술문화관',
    floor: 0,
    position: { x: 1760, y: 2680 },
    aliases: ['학술관', '문화관', 'K동'],
  },
];

// 검색 필터 및 정렬 로직 (공백 단어 AND 매칭 + 완전/접두어/부분 일치 정렬)
export function filterMockPlaces(params: {
  q: string;
  category?: string;
  buildingId?: number;
  limit?: number;
}): PlaceListResponse {
  const rawQuery = params.q.trim().toLowerCase();
  if (!rawQuery) {
    return { items: [] };
  }

  const tokens = rawQuery.split(/\s+/).filter(Boolean);
  const limit = Math.min(params.limit ?? 10, 30);

  const matched = MOCK_PLACES.filter((p) => {
    if (params.category && p.category !== params.category) return false;
    if (params.buildingId !== undefined && p.buildingId !== params.buildingId) {
      return false;
    }

    const haystacks = [
      p.name.toLowerCase(),
      (p.buildingName || '').toLowerCase(),
      ...p.aliases.map((a) => a.toLowerCase()),
    ];

    return tokens.every((tok) => haystacks.some((h) => h.includes(tok)));
  });

  matched.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aExact = aName === rawQuery || a.aliases.some((al) => al.toLowerCase() === rawQuery);
    const bExact = bName === rawQuery || b.aliases.some((al) => al.toLowerCase() === rawQuery);
    if (aExact !== bExact) return aExact ? -1 : 1;

    const aPrefix = aName.startsWith(rawQuery);
    const bPrefix = bName.startsWith(rawQuery);
    if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;

    return aName.localeCompare(bName, 'ko');
  });

  return {
    items: matched.slice(0, limit).map(({ aliases: _aliases, ...rest }) => rest),
  };
}

// 지도 클릭 시 가장 가까운 장소 반환
export function findNearestMockPlace(params: {
  x: number;
  y: number;
  floor?: number;
}): NearestPlaceResponse | null {
  const targetFloor = params.floor ?? 0;
  const candidates = MOCK_PLACES.filter((p) => p.floor === targetFloor);
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestDist = Math.hypot(best.position.x - params.x, best.position.y - params.y);

  for (let i = 1; i < candidates.length; i++) {
    const d = Math.hypot(
      candidates[i].position.x - params.x,
      candidates[i].position.y - params.y
    );
    if (d < bestDist) {
      bestDist = d;
      best = candidates[i];
    }
  }

  const { aliases: _aliases, ...cleanPlace } = best;
  return {
    place: cleanPlace,
    distancePx: Math.round(bestDist * 10) / 10,
  };
}

// 건물/층에 해당하는 층 단면도 URL (없으면 null, 실외(floor 0)도 null)
function findMockFloorImageUrl(
  buildingId: number | null,
  floor: number
): string | null {
  if (buildingId === null || floor === 0) return null;
  const detail = MOCK_BUILDING_DETAILS[buildingId];
  return detail?.floors.find((f) => f.floor === floor)?.floorImageUrl ?? null;
}

// 경로 계산 Mock 함수
export function calculateMockRoute(req: RouteRequest): RouteResponse {
  const fromPlace = MOCK_PLACES.find((p) => p.id === req.from.placeId);
  const toPlace = MOCK_PLACES.find((p) => p.id === req.to.placeId);

  if (!fromPlace || !toPlace) {
    throw {
      status: 404,
      code: 'PLACE_NOT_FOUND',
      message: `존재하지 않는 장소입니다. (from=${req.from.placeId}, to=${req.to.placeId})`,
    };
  }

  if (fromPlace.id === toPlace.id) {
    throw {
      status: 400,
      code: 'SAME_PLACE',
      message: '출발지와 도착지가 같습니다.',
    };
  }

  const mode = req.options?.mode ?? 'FASTEST';
  const avoidRoad = req.options?.avoidRoad ?? false;
  const avoidStairs = req.options?.avoidStairs ?? false;
  const compare = req.options?.compare ?? true;

  // 특수 테스트 케이스: 명진관(엘리베이터 없음) 1층이 아닌 곳에서 계단 회피 시 NO_ROUTE 테스트용
  if (avoidStairs && (fromPlace.buildingId === 1 || toPlace.buildingId === 1) && (fromPlace.floor > 1 || toPlace.floor > 1)) {
    throw {
      status: 422,
      code: 'NO_ROUTE',
      message: '명진관에는 엘리베이터가 없어 계단 회피 경로를 찾을 수 없습니다.',
    };
  }

  // 대표 시나리오 1: 팔정도(101) -> 신공학관 4142호(12) 또는 신공학관 4층(13)
  const isPaljeongdoToShingong =
    fromPlace.id === 101 && [10, 11, 12, 13, 14].includes(toPlace.id);

  if (isPaljeongdoToShingong) {
    const use9FBridgeShortcut = mode === 'FASTEST' || mode === 'EASIEST';
    return {
      summary: {
        from: { id: fromPlace.id, name: fromPlace.name },
        to: { id: toPlace.id, name: toPlace.name },
        totalSeconds: use9FBridgeShortcut ? 210 : 312,
        totalKcal: mode === 'EASIEST' ? 11.2 : 18.4,
        floorChanges: 1,
        usesRoad: false,
        usesShortcut: true,
        savedSeconds: compare ? 140 : null,
      },
      segments: [
        {
          index: 0,
          indoor: false,
          buildingId: null,
          floor: 0,
          floorImageUrl: null,
          isShortcut: false,
          name: null,
          points: [
            { nodeId: 501, x: 1050, y: 2450 },
            { nodeId: 502, x: 890, y: 2475 },
            { nodeId: 503, x: 720, y: 2495 },
          ],
        },
        {
          index: 1,
          indoor: false,
          buildingId: null,
          floor: 0,
          floorImageUrl: null,
          isShortcut: true,
          name: '만해광장-신공학관 9층 연결다리',
          points: [
            { nodeId: 503, x: 720, y: 2495 },
            { nodeId: 504, x: 560, y: 2510 },
          ],
        },
        {
          index: 2,
          indoor: true,
          buildingId: 3,
          floor: toPlace.floor || 4,
          floorImageUrl: '/static/floor/shingong_4.png',
          isShortcut: false,
          name: null,
          points: [
            { nodeId: 504, x: 560, y: 2510 },
            { nodeId: 610, x: 540, y: 2530 },
            { nodeId: 611, x: toPlace.position.x, y: toPlace.position.y },
          ],
        },
      ],
      steps: [
        {
          index: 0,
          action: 'START',
          text: `${fromPlace.name}에서 출발합니다`,
          position: { x: 1050, y: 2450 },
          segmentIndex: 0,
          floor: 0,
          seconds: null,
        },
        {
          index: 1,
          action: 'WALK',
          text: '중앙도서관 남측 보행로를 따라 약 85초 이동',
          position: { x: 890, y: 2475 },
          segmentIndex: 0,
          floor: 0,
          seconds: 85,
        },
        {
          index: 2,
          action: 'WALK',
          text: '★ 지름길: 만해광장-신공학관 9층 연결다리로 이동 (가파른 내리막 우회)',
          position: { x: 720, y: 2495 },
          segmentIndex: 1,
          floor: 0,
          seconds: 45,
        },
        {
          index: 3,
          action: 'ENTER_BUILDING',
          text: '신공학관 9층 연결 입구로 들어가세요',
          position: { x: 560, y: 2510 },
          segmentIndex: 2,
          floor: 9,
          seconds: 10,
        },
        {
          index: 4,
          action: 'ELEVATOR',
          text: `엘리베이터를 타고 ${toPlace.floor || 4}층으로 이동`,
          position: { x: 540, y: 2530 },
          segmentIndex: 2,
          floor: toPlace.floor || 4,
          seconds: 70,
        },
        {
          index: 5,
          action: 'ARRIVE',
          text:
            toPlace.id === 12
              ? '도착: 엘리베이터에서 내려 오른쪽 복도 끝 (신공학관 4142호)'
              : `도착: ${toPlace.name}`,
          position: { x: toPlace.position.x, y: toPlace.position.y },
          segmentIndex: 2,
          floor: toPlace.floor || 4,
          seconds: null,
        },
      ],
    };
  }

  // 대표 시나리오 2: 혜화관(50/51) <-> 경영관(60/61) 또는 학술문화관(80) (구름다리 지름길)
  const isHyehwaBizRoute =
    [50, 51].includes(fromPlace.id) && [60, 61, 80].includes(toPlace.id);

  if (isHyehwaBizRoute) {
    return {
      summary: {
        from: { id: fromPlace.id, name: fromPlace.name },
        to: { id: toPlace.id, name: toPlace.name },
        totalSeconds: 135,
        totalKcal: 7.5,
        floorChanges: 0,
        usesRoad: false,
        usesShortcut: true,
        savedSeconds: compare ? 185 : null,
      },
      segments: [
        {
          index: 0,
          indoor: true,
          buildingId: 5,
          floor: 3,
          floorImageUrl: '/static/floor/hyehwa_3.png',
          isShortcut: false,
          name: null,
          points: [
            { nodeId: 701, x: fromPlace.position.x, y: fromPlace.position.y },
            { nodeId: 702, x: 1490, y: 2790 },
          ],
        },
        {
          index: 1,
          indoor: false,
          buildingId: null,
          floor: 3,
          floorImageUrl: null,
          isShortcut: true,
          name: '혜화관-경영관 3층 구름다리',
          points: [
            { nodeId: 702, x: 1490, y: 2790 },
            { nodeId: 703, x: 1585, y: 2760 },
          ],
        },
        {
          index: 2,
          indoor: true,
          buildingId: 6,
          floor: 3,
          floorImageUrl: '/static/floor/kyungyoung_3.png',
          isShortcut: false,
          name: null,
          points: [
            { nodeId: 703, x: 1585, y: 2760 },
            { nodeId: 704, x: toPlace.position.x, y: toPlace.position.y },
          ],
        },
      ],
      steps: [
        {
          index: 0,
          action: 'START',
          text: `${fromPlace.name}에서 출발합니다`,
          position: { x: fromPlace.position.x, y: fromPlace.position.y },
          segmentIndex: 0,
          floor: 3,
          seconds: null,
        },
        {
          index: 1,
          action: 'WALK',
          text: '혜화관 3층 복도를 따라 연결 통로 방향으로 약 45초 이동',
          position: { x: 1490, y: 2790 },
          segmentIndex: 0,
          floor: 3,
          seconds: 45,
        },
        {
          index: 2,
          action: 'WALK',
          text: '★ 지름길: 혜화관-경영관 3층 구름다리를 건너세요 (계단·경사로 회피)',
          position: { x: 1535, y: 2775 },
          segmentIndex: 1,
          floor: 3,
          seconds: 40,
        },
        {
          index: 3,
          action: 'ENTER_BUILDING',
          text: '경영관 3층 로비로 진입 후 목적지까지 약 50초 이동',
          position: { x: 1585, y: 2760 },
          segmentIndex: 2,
          floor: 3,
          seconds: 50,
        },
        {
          index: 4,
          action: 'ARRIVE',
          text: `도착: ${toPlace.name}`,
          position: { x: toPlace.position.x, y: toPlace.position.y },
          segmentIndex: 2,
          floor: 3,
          seconds: null,
        },
      ],
    };
  }

  // 대표 시나리오 3: 후문(104) -> 팔정도(101) 또는 명진관(20/21) (신공학관 1층~9층 엘리베이터 관통 지름길)
  const isBackGateToTop =
    fromPlace.id === 104 && [101, 20, 21, 30].includes(toPlace.id);

  if (isBackGateToTop) {
    return {
      summary: {
        from: { id: fromPlace.id, name: fromPlace.name },
        to: { id: toPlace.id, name: toPlace.name },
        totalSeconds: 245,
        totalKcal: mode === 'EASIEST' ? 9.8 : 14.2,
        floorChanges: 1,
        usesRoad: false,
        usesShortcut: true,
        savedSeconds: compare ? 210 : null,
      },
      segments: [
        {
          index: 0,
          indoor: false,
          buildingId: null,
          floor: 0,
          floorImageUrl: null,
          isShortcut: false,
          name: null,
          points: [
            { nodeId: 801, x: fromPlace.position.x, y: fromPlace.position.y },
            { nodeId: 802, x: 482, y: 2525 },
          ],
        },
        {
          index: 1,
          indoor: true,
          buildingId: 3,
          floor: 1,
          floorImageUrl: '/static/floor/shingong_1.png',
          isShortcut: true,
          name: '신공학관 1층→9층 엘리베이터 수직 지름길',
          points: [
            { nodeId: 802, x: 482, y: 2525 },
            { nodeId: 803, x: 560, y: 2510 },
          ],
        },
        {
          index: 2,
          indoor: false,
          buildingId: null,
          floor: 0,
          floorImageUrl: null,
          isShortcut: false,
          name: null,
          points: [
            { nodeId: 803, x: 560, y: 2510 },
            { nodeId: 804, x: 820, y: 2480 },
            { nodeId: 805, x: toPlace.position.x, y: toPlace.position.y },
          ],
        },
      ],
      steps: [
        {
          index: 0,
          action: 'START',
          text: `${fromPlace.name}에서 출발합니다`,
          position: { x: fromPlace.position.x, y: fromPlace.position.y },
          segmentIndex: 0,
          floor: 0,
          seconds: null,
        },
        {
          index: 1,
          action: 'WALK',
          text: '신공학관 1층 정문까지 약 60초 이동',
          position: { x: 420, y: 2440 },
          segmentIndex: 0,
          floor: 0,
          seconds: 60,
        },
        {
          index: 2,
          action: 'ENTER_BUILDING',
          text: '신공학관 1층으로 들어가세요',
          position: { x: 482, y: 2525 },
          segmentIndex: 1,
          floor: 1,
          seconds: 15,
        },
        {
          index: 3,
          action: 'ELEVATOR',
          text: '★ 지름길: 엘리베이터를 타고 9층까지 올라가세요 (가파른 언덕길 회피)',
          position: { x: 520, y: 2518 },
          segmentIndex: 1,
          floor: 9,
          seconds: 65,
        },
        {
          index: 4,
          action: 'EXIT_BUILDING',
          text: '신공학관 9층 연결 출구로 나와 고지대 평지 보행로를 따라 이동',
          position: { x: 560, y: 2510 },
          segmentIndex: 2,
          floor: 0,
          seconds: 105,
        },
        {
          index: 5,
          action: 'ARRIVE',
          text: `도착: ${toPlace.name}`,
          position: { x: toPlace.position.x, y: toPlace.position.y },
          segmentIndex: 2,
          floor: toPlace.floor,
          seconds: null,
        },
      ],
    };
  }

  // 일반 경로 생성 (임의의 출발지-도착지 조합)
  const midX = Math.round((fromPlace.position.x + toPlace.position.x) / 2);
  const midY = Math.round((fromPlace.position.y + toPlace.position.y) / 2) + (avoidRoad ? -90 : 0);
  const pixelDist = Math.hypot(
    toPlace.position.x - fromPlace.position.x,
    toPlace.position.y - fromPlace.position.y
  );
  const baseSec = Math.max(90, Math.round(pixelDist * 0.32));
  const totalSeconds = mode === 'EASIEST' ? Math.round(baseSec * 1.15) : baseSec;
  const totalKcal =
    Math.round((mode === 'EASIEST' ? totalSeconds * 0.042 : totalSeconds * 0.062) * 10) / 10;

  return {
    summary: {
      from: { id: fromPlace.id, name: fromPlace.name },
      to: { id: toPlace.id, name: toPlace.name },
      totalSeconds,
      totalKcal,
      floorChanges:
        (fromPlace.floor !== 0 ? 1 : 0) + (toPlace.floor !== 0 ? 1 : 0),
      // 일반 경로 mock은 차도·지름길 구간을 만들지 않는다. (명세: 지름길이 없으면 usesShortcut=false, savedSeconds=null)
      usesRoad: false,
      usesShortcut: false,
      savedSeconds: null,
    },
    segments: [
      {
        index: 0,
        indoor: fromPlace.floor !== 0,
        buildingId: fromPlace.buildingId,
        floor: fromPlace.floor,
        floorImageUrl: findMockFloorImageUrl(fromPlace.buildingId, fromPlace.floor),
        isShortcut: false,
        name: null,
        points: [
          { nodeId: 901, x: fromPlace.position.x, y: fromPlace.position.y },
          { nodeId: 902, x: midX, y: midY },
        ],
      },
      {
        index: 1,
        indoor: toPlace.floor !== 0,
        buildingId: toPlace.buildingId,
        floor: toPlace.floor,
        floorImageUrl: findMockFloorImageUrl(toPlace.buildingId, toPlace.floor),
        isShortcut: false,
        name: null,
        points: [
          { nodeId: 902, x: midX, y: midY },
          { nodeId: 903, x: toPlace.position.x, y: toPlace.position.y },
        ],
      },
    ],
    steps: [
      {
        index: 0,
        action: 'START',
        text: `${fromPlace.name}에서 출발합니다`,
        position: { x: fromPlace.position.x, y: fromPlace.position.y },
        segmentIndex: 0,
        floor: fromPlace.floor,
        seconds: null,
      },
      {
        index: 1,
        action: 'WALK',
        text: `${avoidRoad ? '차도를 피해 보행 전용 길로' : '캠퍼스 주 보행로를 따라'} 약 ${Math.round(
          totalSeconds * 0.55
        )}초 이동`,
        position: { x: midX, y: midY },
        segmentIndex: 0,
        floor: 0,
        seconds: Math.round(totalSeconds * 0.55),
      },
      {
        index: 2,
        action: toPlace.floor > 1 ? 'ELEVATOR' : 'WALK',
        text: `${toPlace.name} 방향으로 이동`,
        position: {
          x: Math.round((midX + toPlace.position.x) / 2),
          y: Math.round((midY + toPlace.position.y) / 2),
        },
        segmentIndex: 1,
        floor: toPlace.floor,
        seconds: Math.round(totalSeconds * 0.45),
      },
      {
        index: 3,
        action: 'ARRIVE',
        text: `도착: ${toPlace.name}`,
        position: { x: toPlace.position.x, y: toPlace.position.y },
        segmentIndex: 1,
        floor: toPlace.floor,
        seconds: null,
      },
    ],
  };
}
