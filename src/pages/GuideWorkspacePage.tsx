import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiClientError,
  calculateRoute,
  fetchBuildingDetail,
  fetchBuildings,
  fetchMapInfo,
  fetchNearestPlace,
  getUseMockMode,
  searchPlaces,
  setUseMockMode,
} from '../shared/api/apiClient';
import { MOCK_MAP_INFO, MOCK_PLACES } from '../shared/data/mockApiV1Data';
import {
  BuildingDetailResponse,
  BuildingSummary,
  MapInfoResponse,
  PlaceSummary,
  RouteMode,
  RouteResponse,
} from '../shared/types/api';
import { BuildingDetailPanel } from '../widgets/building-detail/BuildingDetailPanel';
import { Map2DViewer } from '../widgets/map-2d-viewer/Map2DViewer';
import { RouteSidebar } from '../widgets/route-sidebar/RouteSidebar';
import { MapPickTarget } from '../shared/types/ui';

// 초기 출발지/도착지 (ID가 아니라 이름으로 찾아 실서버·mock 어느 쪽에서도 동작하게 한다)
const DEFAULT_FROM_NAME = '팔정도';
const DEFAULT_TO_NAME = '신공학관 4142호';

// 이름으로 장소 하나를 찾는다. 완전 일치가 있으면 그것을, 없으면 첫 번째 결과를 쓴다.
async function findPlaceByName(name: string): Promise<PlaceSummary | null> {
  const res = await searchPlaces({ q: name, limit: 10 });
  return res.items.find((p) => p.name === name) ?? res.items[0] ?? null;
}

export const GuideWorkspacePage: React.FC = () => {
  const [useMock, setUseMock] = useState<boolean>(getUseMockMode());
  const [mapInfo, setMapInfo] = useState<MapInfoResponse>(MOCK_MAP_INFO);
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [selectedBuilding, setSelectedBuilding] =
    useState<BuildingDetailResponse | null>(null);

  // 출발지 / 도착지 / 경로 옵션 상태
  const [fromPlace, setFromPlace] = useState<PlaceSummary | null>(null);
  const [toPlace, setToPlace] = useState<PlaceSummary | null>(null);
  const [mode, setMode] = useState<RouteMode>('FASTEST');
  const [avoidRoad, setAvoidRoad] = useState<boolean>(false);

  // 경로 결과 및 선택된 step 상태
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(0);
  const [mapPickTarget, setMapPickTarget] = useState<MapPickTarget>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const routeRequestIdRef = useRef(0);

  // 지도 보조 라벨(랜드마크/출입구). /places는 q가 필수라 전체 목록 API가 없으므로
  // mock 모드에서만 mock 장소를 쓰고, 실서버 모드에서는 건물 마커만 표시한다.
  const landmarks: PlaceSummary[] = useMock
    ? MOCK_PLACES.filter(
        (p) => p.category === 'LANDMARK' || p.category === 'ENTRANCE'
      )
    : [];

  // 데이터 소스가 바뀔 때마다 기본 출발지/도착지를 해당 소스에서 다시 찾는다.
  useEffect(() => {
    let cancelled = false;
    async function loadDefaults() {
      try {
        const [f, t] = await Promise.all([
          findPlaceByName(DEFAULT_FROM_NAME),
          findPlaceByName(DEFAULT_TO_NAME),
        ]);
        if (!cancelled) {
          setFromPlace(f);
          setToPlace(t);
        }
      } catch {
        if (!cancelled) {
          setFromPlace(null);
          setToPlace(null);
          setRouteResult(null);
        }
      }
    }
    loadDefaults();
    return () => {
      cancelled = true;
    };
  }, [useMock]);

  // 앱 시작 시 GET /map 및 GET /buildings 호출
  useEffect(() => {
    let cancelled = false;
    async function initMapAndBuildings() {
      try {
        const [mInfo, bList] = await Promise.all([
          fetchMapInfo(),
          fetchBuildings(),
        ]);
        if (!cancelled) {
          setMapInfo(mInfo);
          setBuildings(bList.items);
        }
      } catch (err) {
        if (!cancelled && err instanceof ApiClientError) {
          setErrorText(err.message);
        }
      }
    }
    initMapAndBuildings();
    return () => {
      cancelled = true;
    };
  }, [useMock]);

  // 출발지·도착지·옵션이 바뀔 때마다 POST /routes 실행
  const runRouteCalculation = useCallback(async () => {
    if (!fromPlace || !toPlace) return;
    const requestId = ++routeRequestIdRef.current;
    setIsLoading(true);
    setErrorText(null);
    try {
      const res = await calculateRoute({
        from: { placeId: fromPlace.id },
        to: { placeId: toPlace.id },
        options: {
          mode,
          avoidRoad,
          compare: true,
        },
      });
      if (requestId !== routeRequestIdRef.current) return; // 더 최신 요청이 있으면 무시
      setRouteResult(res);
      setActiveStepIndex(0);
    } catch (err) {
      if (requestId !== routeRequestIdRef.current) return;
      setRouteResult(null);
      if (err instanceof ApiClientError) {
        setErrorText(err.message);
      } else {
        setErrorText('경로를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      if (requestId === routeRequestIdRef.current) setIsLoading(false);
    }
  }, [fromPlace, toPlace, mode, avoidRoad]);

  useEffect(() => {
    runRouteCalculation();
  }, [runRouteCalculation]);

  // 지도 클릭 시 GET /places/nearest 호출하여 출발지 또는 도착지 설정
  const handleMapPixelClick = async (x: number, y: number) => {
    // 지도 선택 모드가 아닐 때의 클릭/드래그 종료는 출발지·도착지를 바꾸지 않는다.
    const target = mapPickTarget;
    if (!target) return;
    try {
      const nearest = await fetchNearestPlace({ x, y, floor: 0 });
      if (target === 'TO') {
        setToPlace(nearest.place);
      } else {
        setFromPlace(nearest.place);
      }
      setMapPickTarget(null);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorText(err.message);
      }
    }
  };

  // 건물 마커 클릭 시 GET /buildings/{buildingId} 호출
  const handleSelectBuilding = async (buildingId: number) => {
    try {
      const detail = await fetchBuildingDetail(buildingId);
      setSelectedBuilding(detail);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorText(err.message);
      }
    }
  };

  // 건물 상세 패널에서 출발지/도착지로 즉시 지정
  const handleSetBuildingAsEndpoint = async (
    buildingName: string,
    target: 'FROM' | 'TO'
  ) => {
    try {
      // 강의실·출입구가 아니라 건물 자체(BUILDING)를 우선 선택한다.
      const res = await searchPlaces({
        q: buildingName,
        category: 'BUILDING',
        limit: 10,
      });
      const place =
        res.items.find((p) => p.name === buildingName) ?? res.items[0];
      if (!place) {
        setErrorText('이 건물에 해당하는 장소를 찾을 수 없어요.');
        return;
      }
      if (target === 'FROM') setFromPlace(place);
      else setToPlace(place);
    } catch (err) {
      if (err instanceof ApiClientError) setErrorText(err.message);
    }
  };

  const handleApplyPreset = async (fromName: string, toName: string) => {
    try {
      const [f, t] = await Promise.all([
        findPlaceByName(fromName),
        findPlaceByName(toName),
      ]);
      if (f) setFromPlace(f);
      if (t) setToPlace(t);
      if (!f || !t) setErrorText('프리셋 장소를 현재 데이터에서 찾을 수 없어요.');
    } catch (err) {
      if (err instanceof ApiClientError) setErrorText(err.message);
    }
  };

  const handleToggleMockMode = (nextMock: boolean) => {
    setUseMockMode(nextMock);
    setUseMock(nextMock);
    setErrorText(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="app-title">동국대학교 웹 길안내</h1>
          <span className="arch-badge">1단계: 2D 길안내 MVP</span>
        </div>

        {/* 데이터 소스 전환 (Mock 데이터 <-> 백엔드 FastAPI 서버) */}
        <div className="mode-switcher" role="group" aria-label="API 데이터 소스 전환">
          <button
            type="button"
            aria-pressed={useMock}
            onClick={() => handleToggleMockMode(true)}
            className={`mode-btn ${useMock ? 'mode-btn-active' : ''}`}
          >
            Mock 데이터 모드
          </button>
          <button
            type="button"
            aria-pressed={!useMock}
            onClick={() => handleToggleMockMode(false)}
            className={`mode-btn ${!useMock ? 'mode-btn-active' : ''}`}
          >
            실서버 API 연동 (/api/v1)
          </button>
        </div>
      </header>

      <main className="guide-main-grid">
        {/* 좌측: 검색 / 옵션 / 요약 / 안내 목록 (3D 단계에서도 그대로 재사용) */}
        <RouteSidebar
          fromPlace={fromPlace}
          toPlace={toPlace}
          mode={mode}
          avoidRoad={avoidRoad}
          routeResult={routeResult}
          activeStepIndex={activeStepIndex}
          mapPickTarget={mapPickTarget}
          errorText={errorText}
          isLoading={isLoading}
          onSelectFrom={(p) => setFromPlace(p)}
          onSelectTo={(p) => setToPlace(p)}
          onSwapPlaces={() => {
            setFromPlace(toPlace);
            setToPlace(fromPlace);
          }}
          onChangeMode={(m) => setMode(m)}
          onToggleAvoidRoad={() => setAvoidRoad((prev) => !prev)}
          onChangeMapPickTarget={(target) => setMapPickTarget(target)}
          onSelectStep={(idx) => setActiveStepIndex(idx)}
          onApplyPreset={handleApplyPreset}
        />

        {/* 우측: 2D 지도 뷰어 + 건물 상세 드로어 */}
        <div className="guide-map-column">
          <Map2DViewer
            mapInfo={mapInfo}
            buildings={buildings}
            landmarks={landmarks}
            fromPlace={fromPlace}
            toPlace={toPlace}
            routeResult={routeResult}
            activeStepIndex={activeStepIndex}
            mapPickTarget={mapPickTarget}
            selectedBuildingId={selectedBuilding?.id ?? null}
            onMapPixelClick={handleMapPixelClick}
            onSelectStep={(idx) => setActiveStepIndex(idx)}
            onSelectBuilding={handleSelectBuilding}
          />

          <BuildingDetailPanel
            building={selectedBuilding}
            onClose={() => setSelectedBuilding(null)}
            onSetAsFrom={(name) => handleSetBuildingAsEndpoint(name, 'FROM')}
            onSetAsTo={(name) => handleSetBuildingAsEndpoint(name, 'TO')}
          />
        </div>
      </main>
    </div>
  );
};
