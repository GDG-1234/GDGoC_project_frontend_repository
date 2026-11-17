import { searchPlaces } from '../../shared/api/apiClient';
import { BuildingSummary, PlaceSummary, RouteMode } from '../../shared/types/api';

export type PortalTopic = 'CAFETERIA' | 'LIBRARY' | 'NOTICE' | 'HELP';

export type ParsedCampusIntent =
  | {
      kind: 'ROUTE';
      fromQuery: string | null;
      toQuery: string;
      mode?: RouteMode;
      avoidRoad?: boolean;
    }
  | {
      kind: 'BUILDING';
      query: string;
    }
  | {
      kind: 'PORTAL_INFO';
      topic: PortalTopic;
    }
  | {
      kind: 'SEARCH_PLACE';
      query: string;
    };

// 자주 쓰는 동국대 건물 약칭 보정 (Mock·실서버 모두 자연어 매칭률을 높인다)
const QUERY_ALIAS_FALLBACKS: Array<[RegExp, string]> = [
  [/신공\b/g, '신공학관'],
  [/중도\b/g, '중앙도서관'],
  [/사과관|경영관/g, '사회과학관·경영관'],
  [/만해관|법학관/g, '법학관·만해관'],
];

function extractRouteOptions(text: string): {
  mode?: RouteMode;
  avoidRoad?: boolean;
} {
  const mode: RouteMode | undefined = /편한\s*길|덜\s*힘든|완만|칼로리/.test(text)
    ? 'EASIEST'
    : /빠른\s*길|최단|빨리/.test(text)
    ? 'FASTEST'
    : undefined;
  const avoidRoad = /차도\s*피|차\s*없는|인도/.test(text) ? true : undefined;
  return { mode, avoidRoad };
}

function cleanPlaceFragment(raw: string): string {
  let result = raw
    .replace(
      /(?:편한\s*길|빠른\s*길|차도\s*피해(?:서)?|차도\s*피하(?:고|기)|인도로)(?:으로|로)?/g,
      ' '
    )
    .trim();

  // 문장 끝에 수식어가 연달아 붙는 경우 ("~ 가는 길 알려줘", "~ 편의시설이랑 운영시간 알려줘") 반복 제거
  let prev = '';
  while (result !== prev) {
    prev = result;
    result = result
      .replace(/[?.!~]+$/g, '')
      .replace(
        /\s*(?:가는\s*길|가려면|어떻게\s*가(?:요|나요|지)?|길안내|길\s*찾아(?:줘|주세요)?|안내(?:해\s*줘|해\s*주세요)?|알려(?:줘|주세요)?|보여(?:줘|주세요)?|찾아(?:줘|주세요)?|가고\s*싶어(?:요)?|싶어(?:요)?)$/g,
        ''
      )
      .replace(
        /\s*(?:편의시설|운영\s*시간|전화\s*번호|연락처|몇\s*층|어디(?:야|에요|인가요)?|위치|정보|상세)(?:이랑|랑|하고|과|와|좀|도|은|는|이|가)?$/g,
        ''
      )
      .replace(/(?:에서|부터|까지|으로|로|을|를)$/g, '')
      .trim();
  }
  return result;
}

export function parseCampusQuery(
  rawInput: string,
  buildings: BuildingSummary[]
): ParsedCampusIntent {
  const text = rawInput.trim();

  // 1. 포털 확장 기능 안내 키워드 (학식·도서·공지·도움말)
  if (/도움말|뭐\s*할\s*수|사용법|안녕/.test(text) && text.length < 24) {
    return { kind: 'PORTAL_INFO', topic: 'HELP' };
  }
  if (/학식|메뉴|식단|밥/.test(text) && !/가는\s*길|까지|에서|→|->/.test(text)) {
    return { kind: 'PORTAL_INFO', topic: 'CAFETERIA' };
  }
  if (/도서\s*검색|대출|열람실/.test(text) && !/가는\s*길|까지|에서/.test(text)) {
    return { kind: 'PORTAL_INFO', topic: 'LIBRARY' };
  }
  if (/공지|채용|장학|졸업\s*요건|학사/.test(text)) {
    return { kind: 'PORTAL_INFO', topic: 'NOTICE' };
  }

  const options = extractRouteOptions(text);

  // 2. "A → B" / "A -> B" 형식
  const arrowMatch = text.match(/^(.+?)\s*(?:→|->|~)\s*(.+)$/);
  if (arrowMatch) {
    const fromQuery = cleanPlaceFragment(arrowMatch[1]);
    const toQuery = cleanPlaceFragment(arrowMatch[2]);
    if (fromQuery && toQuery) {
      return { kind: 'ROUTE', fromQuery, toQuery, ...options };
    }
  }

  // 3. "A에서 B(까지) ..." 형식
  const fromToMatch = text.match(/^(.+?)(?:에서|부터)\s+(.+)$/);
  if (fromToMatch) {
    const fromQuery = cleanPlaceFragment(fromToMatch[1]);
    const toQuery = cleanPlaceFragment(fromToMatch[2]);
    if (fromQuery && toQuery) {
      return { kind: 'ROUTE', fromQuery, toQuery, ...options };
    }
  }

  // 4. 도착지만 있는 경로 질의 ("중앙도서관 가는 길", "신공학관 3층까지 어떻게 가")
  if (/(?:가는\s*길|어떻게\s*가|길안내|길\s*찾|까지)/.test(text)) {
    const toQuery = cleanPlaceFragment(text);
    if (toQuery) {
      return { kind: 'ROUTE', fromQuery: null, toQuery, ...options };
    }
  }

  // 5. 건물 상세 질의 ("과학관 편의시설", "중앙도서관 운영시간", 또는 건물명 단독 입력)
  const cleaned = cleanPlaceFragment(text);
  const isBuildingKeyword =
    /(?:편의시설|운영\s*시간|전화|연락처|몇\s*층|정보|어디|위치)/.test(text);
  const matchesBuildingName = buildings.some(
    (b) =>
      b.name === cleaned ||
      b.name.includes(cleaned) ||
      b.aliases.some((a) => a === cleaned || cleaned.includes(a))
  );

  if (isBuildingKeyword || matchesBuildingName) {
    return { kind: 'BUILDING', query: cleaned || text };
  }

  return { kind: 'SEARCH_PLACE', query: cleaned || text };
}

export async function resolvePlaceByQuery(
  rawQuery: string
): Promise<PlaceSummary | null> {
  const candidates = [rawQuery.trim()];
  let expanded = rawQuery.trim();
  for (const [pattern, replacement] of QUERY_ALIAS_FALLBACKS) {
    expanded = expanded.replace(pattern, replacement);
  }
  if (expanded && expanded !== candidates[0]) {
    candidates.push(expanded);
  }

  for (const q of candidates) {
    if (!q) continue;
    const res = await searchPlaces({ q, limit: 15 });
    if (res.items.length > 0) {
      return (
        res.items.find((p) => p.name === q) ??
        res.items.find((p) => p.name.startsWith(q)) ??
        res.items[0]
      );
    }
  }
  return null;
}

export function resolveBuildingByQuery(
  rawQuery: string,
  buildings: BuildingSummary[]
): BuildingSummary | null {
  const q = rawQuery.trim();
  if (!q) return null;
  return (
    buildings.find((b) => b.name === q) ??
    buildings.find((b) => b.aliases.some((a) => a === q)) ??
    buildings.find((b) => b.name.includes(q)) ??
    buildings.find((b) => b.aliases.some((a) => q.includes(a) || a.includes(q))) ??
    null
  );
}
