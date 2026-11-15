import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatFloorLabel } from '../../shared/api/apiClient';
import {
  BuildingSummary,
  MapInfoResponse,
  PlaceSummary,
  RouteResponse,
} from '../../shared/types/api';
import { MapPickTarget } from '../../shared/types/ui';

interface Map2DViewerProps {
  mapInfo: MapInfoResponse;
  buildings: BuildingSummary[];
  /** 보조 라벨로 표시할 랜드마크/출입구 (데이터 소스는 상위에서 결정) */
  landmarks: PlaceSummary[];
  fromPlace: PlaceSummary | null;
  toPlace: PlaceSummary | null;
  routeResult: RouteResponse | null;
  activeStepIndex: number | null;
  mapPickTarget: MapPickTarget;
  selectedBuildingId: number | null;
  onMapPixelClick: (x: number, y: number) => void;
  onSelectStep: (stepIndex: number) => void;
  onSelectBuilding: (buildingId: number) => void;
}

// 지도 이미지 픽셀 좌표를 그대로 LatLng으로 쓰는 CRS.
// 명세 1.2: 원점은 왼쪽 위(0,0), x는 오른쪽, y는 아래쪽으로 증가한다.
// 기본 CRS.Simple은 y가 위로 증가하므로 y축 방향만 뒤집어(transformation) 준다.
// 따라서 모든 좌표는 [y, x] 순서(= Leaflet의 [lat, lng])로 넣는다.
const PixelCRS: L.CRS = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(1, 0, 1, 0),
});

const DEFAULT_ZOOM = -1; // 배율 약 50%
const LABEL_HIDE_ZOOM = -1.55; // 이보다 더 축소되면 건물 라벨을 점으로 줄인다
const MAX_FIT_ZOOM = 0;

const toLatLng = (p: { x: number; y: number }): L.LatLngTuple => [p.y, p.x];

// API 응답 문자열은 innerHTML 대신 textContent로 넣는다.
function makeEl(className: string, text?: string): HTMLElement {
  const el = document.createElement('div');
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// 출발/도착 핀 (물방울 모양 SVG). 뾰족한 끝이 좌표 위치다.
function makePinEl(variant: 'pin-from' | 'pin-to'): HTMLElement {
  const wrap = makeEl(`map2d-pin ${variant}`);
  wrap.innerHTML = `
    <svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true">
      <path d="M15 1C7.3 1 1 7.2 1 14.8 1 25.4 15 37 15 37s14-11.6 14-22.2C29 7.2 22.7 1 15 1z"
            class="map2d-pin-body" />
      <circle cx="15" cy="15" r="5" fill="#ffffff" />
    </svg>`;
  return wrap;
}

function makeIcon(
  inner: HTMLElement,
  anchor: 'center' | 'above' | 'above-step' | 'below'
): L.DivIcon {
  return L.divIcon({
    html: inner,
    className: `map2d-lf-marker lf-${anchor}`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function buildFallbackSvg(width: number, height: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const defs = document.createElementNS(ns, 'defs');
  defs.innerHTML = `
    <pattern id="pixelGrid100" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e4e4e7" stroke-width="2" />
    </pattern>
    <pattern id="pixelGrid500" width="500" height="500" patternUnits="userSpaceOnUse">
      <rect width="500" height="500" fill="url(#pixelGrid100)" />
      <path d="M 500 0 L 0 0 0 500" fill="none" stroke="#d4d4d8" stroke-width="4" />
    </pattern>`;
  svg.appendChild(defs);
  [
    { fill: '#f8fafc' },
    { fill: 'url(#pixelGrid500)' },
  ].forEach((attrs) => {
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', attrs.fill);
    svg.appendChild(rect);
  });
  return svg;
}

export const Map2DViewer: React.FC<Map2DViewerProps> = (props) => {
  const {
    mapInfo,
    buildings,
    landmarks,
    fromPlace,
    toPlace,
    routeResult,
    activeStepIndex,
    mapPickTarget,
    selectedBuildingId,
  } = props;

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseGroupRef = useRef<L.LayerGroup | null>(null);
  const floorGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  // Leaflet 이벤트 핸들러는 한 번만 등록되므로 최신 props는 ref로 읽는다.
  const propsRef = useRef(props);
  propsRef.current = props;

  // 단계 이동 effect가 "방금 경로가 바뀐 실행"인지 구분하기 위한 ref
  const stepRouteRef = useRef<RouteResponse | null>(null);

  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(
    null
  );
  const [showPlaceLabels, setShowPlaceLabels] = useState<boolean>(true);

  const isZoomedOut = zoom < LABEL_HIDE_ZOOM;

  const activeStep =
    activeStepIndex !== null && routeResult
      ? routeResult.steps.find((s) => s.index === activeStepIndex) || null
      : null;
  const activeSegment =
    activeStep && routeResult
      ? routeResult.segments.find((seg) => seg.index === activeStep.segmentIndex) ||
        null
      : null;

  // 1. 지도 인스턴스 생성 (한 번만)
  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;
    const info = propsRef.current.mapInfo;

    const clampPixel = (latlng: L.LatLng) => {
      const { width, height } = propsRef.current.mapInfo;
      return {
        x: Math.max(0, Math.min(width, Math.round(latlng.lng))),
        y: Math.max(0, Math.min(height, Math.round(latlng.lat))),
      };
    };

    const map = L.map(el, {
      crs: PixelCRS,
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
      minZoom: info.minZoom,
      maxZoom: info.maxZoom,
      center: toLatLng(info.defaultCenter),
      zoom: DEFAULT_ZOOM,
    });

    // 레이어 순서: 지도 이미지 < 층 단면도 < 경로선 < 마커
    map.createPane('basePane').style.zIndex = '200';
    map.createPane('floorPane').style.zIndex = '250';

    baseGroupRef.current = L.layerGroup().addTo(map);
    floorGroupRef.current = L.layerGroup().addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);
    markerGroupRef.current = L.layerGroup().addTo(map);

    // 드래그와 클릭 구분은 Leaflet이 처리한다 (드래그 후에는 click이 발생하지 않는다)
    map.on('click', (e: L.LeafletMouseEvent) => {
      const pt = clampPixel(e.latlng);
      propsRef.current.onMapPixelClick(pt.x, pt.y);
    });
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setHoverPixel(clampPixel(e.latlng));
    });
    map.on('mouseout', () => setHoverPixel(null));
    map.on('zoom', () => setZoom(map.getZoom()));

    // 컨테이너 크기 변화(창 크기 조절 등)에 맞춰 지도 크기를 갱신한다.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el);

    mapRef.current = map;
    setZoom(map.getZoom());

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      baseGroupRef.current = null;
      floorGroupRef.current = null;
      routeGroupRef.current = null;
      markerGroupRef.current = null;
    };
  }, []);

  // 2. 지도 이미지 / 이동 범위 / 줌 범위 (GET /map 값 반영)
  useEffect(() => {
    const map = mapRef.current;
    const group = baseGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    map.setMinZoom(mapInfo.minZoom);
    map.setMaxZoom(mapInfo.maxZoom);

    const bounds = L.latLngBounds([0, 0], [mapInfo.height, mapInfo.width]);
    map.setMaxBounds(bounds.pad(0.05));
    map.options.maxBoundsViscosity = 1;

    // 백엔드 정적 이미지가 아직 없을 때를 위한 픽셀 좌표 그리드 배경.
    // 실제 이미지가 로드되면 제거한다.
    const fallback = L.svgOverlay(
      buildFallbackSvg(mapInfo.width, mapInfo.height),
      bounds,
      { pane: 'basePane', interactive: false }
    ).addTo(group);

    const image = L.imageOverlay(mapInfo.imageUrl, bounds, {
      pane: 'basePane',
      interactive: false,
      alt: '동국대학교 2D 캠퍼스 지도',
    });
    image.on('load', () => group.removeLayer(fallback));
    image.addTo(group);
  }, [mapInfo]);

  // 3. 실내 구간 선택 시 층 단면도(floorImageUrl) 오버레이
  const floorImageUrl =
    activeSegment?.indoor && activeSegment.floorImageUrl
      ? activeSegment.floorImageUrl
      : null;
  const floorLabel = formatFloorLabel(activeSegment?.floor ?? 0);
  useEffect(() => {
    const group = floorGroupRef.current;
    if (!group) return;
    group.clearLayers();
    if (!floorImageUrl) return;
    L.imageOverlay(
      floorImageUrl,
      L.latLngBounds([0, 0], [mapInfo.height, mapInfo.width]),
      {
        pane: 'floorPane',
        interactive: false,
        opacity: 0.88,
        alt: `실내 층 단면도 (${floorLabel})`,
      }
    ).addTo(group);
  }, [floorImageUrl, floorLabel, mapInfo.width, mapInfo.height]);

  // 4. 경로 segments 폴리라인 + 현재 단계 링 마커
  useEffect(() => {
    const group = routeGroupRef.current;
    if (!group) return;
    group.clearLayers();
    if (!routeResult) return;

    routeResult.segments.forEach((seg) => {
      const latlngs = seg.points.map(toLatLng);
      const isSelectedSeg = activeSegment?.index === seg.index;
      // 현재 선택된 step이 실내 구간일 때 다른 층 segment는 흐리게 표시
      const dim =
        Boolean(activeSegment?.indoor) &&
        activeSegment?.floor !== seg.floor &&
        !isSelectedSeg;
      const opacity = dim ? 0.28 : 1;
      const color = seg.isShortcut
        ? '#ea580c' // 지름길 구간 강조 색상
        : seg.indoor
        ? '#2563eb' // 실내 구간 색상
        : '#18181b'; // 실외 구간 색상

      if (isSelectedSeg) {
        L.polyline(latlngs, {
          color: '#fde047',
          weight: 13,
          opacity,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(group);
      }
      L.polyline(latlngs, {
        color,
        weight: seg.isShortcut ? 7 : 5,
        opacity,
        dashArray: seg.indoor ? '9 6' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(group);
      seg.points.forEach((pt) => {
        L.circleMarker(toLatLng(pt), {
          radius: 4,
          color,
          weight: 2,
          fillColor: '#ffffff',
          fillOpacity: opacity,
          opacity,
          interactive: false,
        }).addTo(group);
      });
    });

    if (activeStep) {
      const center = toLatLng(activeStep.position);
      L.circleMarker(center, {
        radius: 14,
        color: '#eab308',
        weight: 3,
        fillColor: '#facc15',
        fillOpacity: 0.28,
        interactive: false,
      }).addTo(group);
      L.circleMarker(center, {
        radius: 5,
        color: '#18181b',
        weight: 2,
        fillColor: '#facc15',
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);
    }
    // activeStep/activeSegment는 routeResult와 activeStepIndex에서 파생된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeResult, activeStepIndex]);

  // 5. 라벨 / 핀 마커
  useEffect(() => {
    const group = markerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    // (A) 보조 랜드마크/출입문 라벨
    if (showPlaceLabels && !isZoomedOut) {
      landmarks
        .filter(
          (p) =>
            (p.category === 'LANDMARK' || p.category === 'ENTRANCE') &&
            p.id !== fromPlace?.id &&
            p.id !== toPlace?.id
        )
        .forEach((lm) => {
          L.marker(toLatLng(lm.position), {
            icon: makeIcon(makeEl('map2d-landmark-chip', lm.name), 'center'),
            interactive: false,
            keyboard: false,
          }).addTo(group);
        });
    }

    // (B) 건물 마커: 축소 시에는 작은 점, 확대 시에는 이름 칩
    if (showPlaceLabels) {
      buildings.forEach((b) => {
        const isSelected = selectedBuildingId === b.id;
        const inner =
          isZoomedOut && !isSelected
            ? makeEl('map2d-building-dot')
            : makeEl(
                `map2d-building-pin ${isSelected ? 'map-pin-active' : ''}`,
                b.name
              );
        L.marker(toLatLng(b.position), {
          icon: makeIcon(inner, 'center'),
          title: b.name,
          alt: `${b.name} 건물 정보 보기`,
          keyboard: true,
        })
          .on('click', () => propsRef.current.onSelectBuilding(b.id))
          .addTo(group);
      });
    }

    // (C) 지름길 구간 이름 배지
    routeResult?.segments.forEach((seg) => {
      if (!seg.isShortcut || !seg.name || seg.points.length === 0) return;
      const midIdx = Math.floor(seg.points.length / 2);
      const midPt =
        seg.points.length === 2
          ? {
              x: (seg.points[0].x + seg.points[1].x) / 2,
              y: (seg.points[0].y + seg.points[1].y) / 2,
            }
          : seg.points[midIdx];
      L.marker(toLatLng(midPt), {
        icon: makeIcon(makeEl('map2d-shortcut-badge', `★ ${seg.name}`), 'below'),
        interactive: false,
        keyboard: false,
      }).addTo(group);
    });

    // (D) 출발지 / 도착지 핀 (이름은 마우스를 올렸을 때 툴팁으로만 보여 준다)
    if (fromPlace) {
      L.marker(toLatLng(fromPlace.position), {
        icon: makeIcon(makePinEl('pin-from'), 'above'),
        title: `출발: ${fromPlace.name}`,
        alt: `출발: ${fromPlace.name}`,
        keyboard: false,
        zIndexOffset: 600,
      }).addTo(group);
    }
    if (toPlace) {
      L.marker(toLatLng(toPlace.position), {
        icon: makeIcon(makePinEl('pin-to'), 'above'),
        title: `도착: ${toPlace.name}`,
        alt: `도착: ${toPlace.name}`,
        keyboard: false,
        zIndexOffset: 600,
      }).addTo(group);
    }

    // (E) 중간 안내 단계(START/ARRIVE 제외) 선택 시 단계 태그
    if (
      activeStep &&
      activeStep.action !== 'START' &&
      activeStep.action !== 'ARRIVE'
    ) {
      const stepIndex = activeStep.index;
      L.marker(toLatLng(activeStep.position), {
        icon: makeIcon(
          makeEl('map2d-active-step-pin', `${stepIndex + 1}단계 지점`),
          'above-step'
        ),
        alt: `${stepIndex + 1}단계 지점`,
        keyboard: false,
        zIndexOffset: 700,
      })
        .on('click', () => propsRef.current.onSelectStep(stepIndex))
        .addTo(group);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    buildings,
    landmarks,
    showPlaceLabels,
    isZoomedOut,
    selectedBuildingId,
    fromPlace,
    toPlace,
    routeResult,
    activeStepIndex,
  ]);

  // 6. 경로 결과가 바뀌면 전체 경로가 한눈에 들어오도록 자동 맞춤
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeResult) return;
    const pts = routeResult.segments.flatMap((s) => s.points);
    if (pts.length === 0) return;
    map.fitBounds(L.latLngBounds(pts.map(toLatLng)), {
      padding: [70, 70],
      maxZoom: Math.min(mapInfo.maxZoom, MAX_FIT_ZOOM),
      animate: false,
    });
    // 경로가 바뀔 때만 맞춘다. (mapInfo 변경으로 사용자 위치를 초기화하지 않는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeResult]);

  // 7. 단계(step) 클릭 시 해당 위치로 지도 중심 이동
  useEffect(() => {
    const map = mapRef.current;
    if (!map || activeStepIndex === null || !routeResult) return;
    // 새 경로가 도착한 직후에는 위의 "전체 경로 맞춤"이 우선이므로 건너뛴다.
    if (stepRouteRef.current !== routeResult) {
      stepRouteRef.current = routeResult;
      return;
    }
    const step = routeResult.steps.find((s) => s.index === activeStepIndex);
    if (step) map.panTo(toLatLng(step.position));
  }, [activeStepIndex, routeResult]);

  return (
    <section className="map2d-section" aria-label="2D 캠퍼스 픽셀 좌표 지도 뷰어">
      <div
        className={`map2d-viewport ${
          mapPickTarget ? 'map2d-viewport-picking' : ''
        }`}
      >
        <div
          ref={mapElRef}
          className="map2d-leaflet"
          role="application"
          aria-label="캠퍼스 지도 (드래그로 이동, 휠로 확대·축소)"
        />

        {/* 좌상단 플로팅: 범례 + 라벨 토글 */}
        <div className="map2d-float map2d-float-legend">
          <span className="legend-item">
            <span className="legend-line legend-outdoor" /> 실외
          </span>
          <span className="legend-item">
            <span className="legend-line legend-indoor" /> 실내
          </span>
          <span className="legend-item">
            <span className="legend-line legend-shortcut" /> 지름길
          </span>
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={showPlaceLabels}
              onChange={() => setShowPlaceLabels((prev) => !prev)}
            />
            <span>건물 라벨</span>
          </label>
        </div>

        {/* 우상단 플로팅: 확대 / 축소 / 초기 위치 */}
        <div className="map2d-float map2d-float-zoom" role="group" aria-label="지도 조작">
          <button
            type="button"
            className="map2d-zoom-btn"
            aria-label="확대"
            title="확대"
            onClick={() => mapRef.current?.zoomIn()}
          >
            +
          </button>
          <button
            type="button"
            className="map2d-zoom-btn"
            aria-label="축소"
            title="축소"
            onClick={() => mapRef.current?.zoomOut()}
          >
            −
          </button>
          <button
            type="button"
            className="map2d-zoom-btn"
            aria-label="초기 위치로 이동"
            title="초기 위치"
            onClick={() =>
              mapRef.current?.setView(toLatLng(mapInfo.defaultCenter), DEFAULT_ZOOM)
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>

        {/* 우하단: 배율 / 픽셀 좌표 (디버깅용) */}
        <div className="map2d-float map2d-float-status" aria-live="off">
          <span>{Math.round(Math.pow(2, zoom) * 100)}%</span>
          {hoverPixel && (
            <span>
              ({hoverPixel.x}, {hoverPixel.y})
            </span>
          )}
        </div>

        {/* 실내 층 단면도 활성화 상태 HUD 배너 */}
        {activeSegment?.indoor && (
          <div className="map2d-indoor-hud">
            <strong>
              실내 구간 활성화 ({formatFloorLabel(activeSegment.floor)})
            </strong>
            <span>
              단면도 URL: <code>{activeSegment.floorImageUrl || '없음'}</code>
            </span>
          </div>
        )}
      </div>
    </section>
  );
};