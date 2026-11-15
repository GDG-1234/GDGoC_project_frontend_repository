// 위젯 간에 공유하는 UI 상태 타입 (위젯끼리 직접 import하지 않기 위해 shared에 둔다)

/** 지도 클릭으로 선택할 대상. null이면 지도 선택 모드가 꺼진 상태 */
export type MapPickTarget = 'FROM' | 'TO' | null;

/** 사이드바 상단 빠른 검증 루트 프리셋 */
export interface RoutePreset {
  label: string;
  from: string;
  to: string;
}
