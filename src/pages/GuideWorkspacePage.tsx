import React, { useCallback, useEffect, useState } from 'react';
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
import {
  MapPickTarget,
  RouteSidebar,
} from '../widgets/route-sidebar/RouteSidebar';

export const GuideWorkspacePage: React.FC = () => {
  const [useMock, setUseMock] = useState<boolean>(getUseMockMode());
  const [mapInfo, setMapInfo] = useState<MapInfoResponse>(MOCK_MAP_INFO);
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [selectedBuilding, setSelectedBuilding] =
    useState<BuildingDetailResponse | null>(null);

  // 출발지 / 도착지 / 경로 옵션 상태
  const [fromPlace, setFromPlace] = useState<PlaceSummary | null>(
    MOCK_PLACES[0] // 기본: 팔정도(101)
  );
  const [toPlace, setToPlace] = useState<PlaceSummary | null>(
    MOCK_PLACES.find((p) => p.id === 12) || MOCK_PLACES[6] // 기본: 신공학관 4142호(12)
  );
  const [mode, setMode] = useState<RouteMode>('FASTEST');
  const [avoidRoad, setAvoidRoad] = useState<boolean>(false);

  // 경로 결과 및 선택된 step 상태
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(0);
  const [mapPickTarget, setMapPickTarget] = useState<MapPickTarget>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      setRouteResult(res);
      setActiveStepIndex(0);
    } catch (err) {
      setRouteResult(null);
      if (err instanceof ApiClientError) {
        setErrorText(err.message);
      } else {
        setErrorText('경로를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [fromPlace, toPlace, mode, avoidRoad]);

  useEffect(() => {
    runRouteCalculation();
  }, [runRouteCalculation, useMock]);

  // 지도 클릭 시 GET /places/nearest 호출하여 출발지 또는 도착지 설정
  const handleMapPixelClick = async (x: number, y: number) => {
    const target = mapPickTarget || 'FROM';
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
      const res = await searchPlaces({ q: buildingName, limit: 1 });
      if (res.items.length > 0) {
        if (target === 'FROM') setFromPlace(res.items[0]);
        else setToPlace(res.items[0]);
      }
    } catch {
      // ignore
    }
  };

  const handleApplyPreset = (fromId: number, toId: number) => {
    const f = MOCK_PLACES.find((p) => p.id === fromId);
    const t = MOCK_PLACES.find((p) => p.id === toId);
    if (f) setFromPlace(f);
    if (t) setToPlace(t);
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
            onClick={() => handleToggleMockMode(true)}
            className={`mode-btn ${useMock ? 'mode-btn-active' : ''}`}
          >
            Mock 데이터 모드
          </button>
          <button
            type="button"
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
