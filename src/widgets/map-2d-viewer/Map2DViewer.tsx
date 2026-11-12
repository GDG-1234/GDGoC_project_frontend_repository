import React, { useEffect, useRef, useState } from 'react';
import { formatFloorLabel } from '../../shared/api/apiClient';
import { MOCK_PLACES } from '../../shared/data/mockApiV1Data';
import {
  BuildingSummary,
  MapInfoResponse,
  PlaceSummary,
  Point,
  RouteResponse,
} from '../../shared/types/api';
import { MapPickTarget } from '../route-sidebar/RouteSidebar';

interface Map2DViewerProps {
  mapInfo: MapInfoResponse;
  buildings: BuildingSummary[];
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

export const Map2DViewer: React.FC<Map2DViewerProps> = ({
  mapInfo,
  buildings,
  fromPlace,
  toPlace,
  routeResult,
  activeStepIndex,
  mapPickTarget,
  selectedBuildingId,
  onMapPixelClick,
  onSelectStep,
  onSelectBuilding,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 뷰포트 상태: center (지도 픽셀 좌표 x, y) 및 scale (화면 픽셀 / 지도 픽셀)
  const [center, setCenter] = useState<Point>(mapInfo.defaultCenter);
  const [scale, setScale] = useState<number>(0.48);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({
    w: 900,
    h: 640,
  });
  const [hoverPixel, setHoverPixel] = useState<Point | null>(null);
  const [showPlaceLabels, setShowPlaceLabels] = useState<boolean>(true);
  const [mapImgLoaded, setMapImgLoaded] = useState<boolean>(false);
  const [floorImgLoaded, setFloorImgLoaded] = useState<boolean>(false);

  // GET /map의 minZoom, maxZoom을 픽셀 스케일 범위(2^minZoom ~ 2^maxZoom)로 변환
  const minScale = Math.pow(2, mapInfo.minZoom);
  const maxScale = Math.pow(2, mapInfo.maxZoom);

  const dragRef = useRef<{
    isDragging: boolean;
    startClientX: number;
    startClientY: number;
    startCenterX: number;
    startCenterY: number;
  }>({
    isDragging: false,
    startClientX: 0,
    startClientY: 0,
    startCenterX: mapInfo.defaultCenter.x,
    startCenterY: mapInfo.defaultCenter.y,
  });

  // 컨테이너 리사이즈 감지
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setViewportSize({
        w: el.clientWidth || 900,
        h: el.clientHeight || 640,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 경로 결과가 바뀌면 전체 경로가 한눈에 들어오도록 뷰포트 자동 맞춤
  useEffect(() => {
    if (!routeResult || routeResult.segments.length === 0) return;
    const allPts = routeResult.segments.flatMap((s) => s.points);
    if (allPts.length === 0) return;

    const xs = allPts.map((p) => p.x);
    const ys = allPts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    setCenter({
      x: Math.round((minX + maxX) / 2),
      y: Math.round((minY + maxY) / 2),
    });

    const spanX = Math.max(480, maxX - minX + 420);
    const spanY = Math.max(480, maxY - minY + 420);
    const nextScale = Math.min(
      maxScale,
      Math.max(minScale, Math.min(viewportSize.w / spanX, viewportSize.h / spanY))
    );
    setScale(Number(nextScale.toFixed(2)));
  }, [routeResult, viewportSize.w, viewportSize.h, minScale, maxScale]);

  // 단계(step) 클릭 시 해당 위치로 지도 중심 이동
  useEffect(() => {
    if (activeStepIndex === null || !routeResult) return;
    const targetStep = routeResult.steps.find((s) => s.index === activeStepIndex);
    if (targetStep) {
      setCenter({
        x: targetStep.position.x,
        y: targetStep.position.y,
      });
    }
  }, [activeStepIndex, routeResult]);

  const activeStep =
    activeStepIndex !== null && routeResult
      ? routeResult.steps.find((s) => s.index === activeStepIndex) || null
      : null;

  const activeSegment =
    activeStep && routeResult
      ? routeResult.segments.find((seg) => seg.index === activeStep.segmentIndex) ||
        null
      : null;

  useEffect(() => {
    setFloorImgLoaded(false);
  }, [activeSegment?.floorImageUrl]);

  // 화면 좌표(clientX, clientY) -> 지도 픽셀 좌표(x, y) 변환
  const clientToMapPixel = (clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: center.x, y: center.y };
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const mapX = Math.round(center.x + (screenX - rect.width / 2) / scale);
    const mapY = Math.round(center.y + (screenY - rect.height / 2) / scale);
    return {
      x: Math.max(0, Math.min(mapInfo.width, mapX)),
      y: Math.max(0, Math.min(mapInfo.height, mapY)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      isDragging: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCenterX: center.x,
      startCenterY: center.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setHoverPixel(clientToMapPixel(e.clientX, e.clientY));
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;
    setCenter({
      x: Math.max(
        0,
        Math.min(
          mapInfo.width,
          Math.round(dragRef.current.startCenterX - dx / scale)
        )
      ),
      y: Math.max(
        0,
        Math.min(
          mapInfo.height,
          Math.round(dragRef.current.startCenterY - dy / scale)
        )
      ),
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;
    const moved = Math.hypot(
      e.clientX - dragRef.current.startClientX,
      e.clientY - dragRef.current.startClientY
    );
    if (moved < 5) {
      const pt = clientToMapPixel(e.clientX, e.clientY);
      onMapPixelClick(pt.x, pt.y);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const next = Math.max(minScale, Math.min(maxScale, scale * factor));
    setScale(Number(next.toFixed(2)));
  };

  // 지도 픽셀 원점(0,0)이 화면에 놓일 오프셋 계산
  const translateX = viewportSize.w / 2 - center.x * scale;
  const translateY = viewportSize.h / 2 - center.y * scale;

  // 지도 픽셀 좌표 (x, y) -> 뷰포트 화면 픽셀 좌표 (sx, sy) 직접 투영 (위치 오차 0px 보장)
  const toScreenPos = (pt: Point) => ({
    left: `${Math.round(translateX + pt.x * scale)}px`,
    top: `${Math.round(translateY + pt.y * scale)}px`,
  });

  // 줌 배율에 따른 라벨 크기 스케일 (축소 시 자연스럽게 작아지도록 보정)
  const uiScale = Math.max(0.72, Math.min(1.0, 0.55 + scale * 0.65));
  // 너무 축소되었을 때는 보조 라벨(비선택 건물/랜드마크 텍스트)을 숨겨 경로 가림 방지
  const isZoomedOut = scale < 0.34;

  // 줌 배율에 반비례해 선 굵기가 과도하게 두꺼워지거나 얇아지지 않도록 보정
  const baseStroke = Math.max(5, Math.min(14, 7 / Math.sqrt(scale)));

  return (
    <section className="map2d-section" aria-label="2D 캠퍼스 픽셀 좌표 지도 뷰어">
      {/* 상단 지도 상태 및 범례 컨트롤 바 */}
      <div className="map2d-toolbar">
        <div className="map2d-legend">
          <span className="legend-item">
            <span className="legend-line legend-outdoor" /> 실외 경로
          </span>
          <span className="legend-item">
            <span className="legend-line legend-indoor" /> 실내 구간(점선)
          </span>
          <span className="legend-item">
            <span className="legend-line legend-shortcut" /> ★ 지름길 구간(강조)
          </span>
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={showPlaceLabels}
              onChange={() => setShowPlaceLabels((prev) => !prev)}
            />
            <span>주변 건물 라벨</span>
          </label>
        </div>

        <div className="map2d-zoom-controls">
          <span className="mono-tag">
            배율 {Math.round(scale * 100)}%
          </span>
          {hoverPixel && (
            <span className="mono-tag">
              픽셀 ({hoverPixel.x}, {hoverPixel.y})
            </span>
          )}
          <button
            type="button"
            className="strip-btn"
            onClick={() =>
              setScale((s) => Math.min(maxScale, Number((s * 1.2).toFixed(2))))
            }
          >
            확대 +
          </button>
          <button
            type="button"
            className="strip-btn"
            onClick={() =>
              setScale((s) => Math.max(minScale, Number((s * 0.82).toFixed(2))))
            }
          >
            축소 −
          </button>
          <button
            type="button"
            className="strip-btn"
            onClick={() => {
              setCenter(mapInfo.defaultCenter);
              setScale(0.48);
            }}
          >
            초기 위치
          </button>
        </div>
      </div>

      {/* 2D 픽셀 캔버스 뷰포트 */}
      <div
        ref={containerRef}
        className={`map2d-viewport ${
          mapPickTarget ? 'map2d-viewport-picking' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* 1. 픽셀 좌표계 월드 레이어 (배경 이미지 + 단면도 + 경로 SVG 선) */}
        <div
          className="map2d-world"
          style={{
            width: `${mapInfo.width}px`,
            height: `${mapInfo.height}px`,
            transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* 실제 캠퍼스 지도 이미지 */}
          <img
            src={mapInfo.imageUrl}
            alt="동국대학교 2D 캠퍼스 지도"
            className="map2d-base-image"
            width={mapInfo.width}
            height={mapInfo.height}
            onLoad={() => setMapImgLoaded(true)}
            onError={() => setMapImgLoaded(false)}
            style={{ display: mapImgLoaded ? 'block' : 'none' }}
            draggable={false}
          />

          {/* 백엔드 정적 이미지가 아직 없을 때를 위한 픽셀 좌표 그리드 & 캠퍼스 도식 배경 */}
          {!mapImgLoaded && (
            <svg
              width={mapInfo.width}
              height={mapInfo.height}
              viewBox={`0 0 ${mapInfo.width} ${mapInfo.height}`}
              className="map2d-fallback-svg"
            >
              <defs>
                <pattern
                  id="pixelGrid100"
                  width="100"
                  height="100"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 100 0 L 0 0 0 100"
                    fill="none"
                    stroke="#e4e4e7"
                    strokeWidth="2"
                  />
                </pattern>
                <pattern
                  id="pixelGrid500"
                  width="500"
                  height="500"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="500" height="500" fill="url(#pixelGrid100)" />
                  <path
                    d="M 500 0 L 0 0 0 500"
                    fill="none"
                    stroke="#d4d4d8"
                    strokeWidth="4"
                  />
                </pattern>
              </defs>
              <rect
                width={mapInfo.width}
                height={mapInfo.height}
                fill="#f8fafc"
              />
              <rect
                width={mapInfo.width}
                height={mapInfo.height}
                fill="url(#pixelGrid500)"
              />

              {/* 캠퍼스 주요 구역 윤곽선 */}
              <ellipse
                cx="1050"
                cy="2450"
                rx="130"
                ry="85"
                fill="#fef3c7"
                stroke="#d97706"
                strokeWidth="3"
                strokeDasharray="10 6"
              />
              <rect
                x="1180"
                y="2560"
                width="230"
                height="140"
                fill="#ecfdf5"
                stroke="#059669"
                strokeWidth="3"
                strokeDasharray="8 6"
              />
            </svg>
          )}

          {/* 실내 구간 선택 시 층 단면도(floorImageUrl) 오버레이 */}
          {activeSegment?.indoor && activeSegment.floorImageUrl && (
            <img
              src={activeSegment.floorImageUrl}
              alt={`실내 층 단면도 (${formatFloorLabel(activeSegment.floor)})`}
              className="map2d-floor-overlay-image"
              onLoad={() => setFloorImgLoaded(true)}
              onError={() => setFloorImgLoaded(false)}
              style={{
                display: floorImgLoaded ? 'block' : 'none',
                left: 0,
                top: 0,
                width: `${mapInfo.width}px`,
                height: `${mapInfo.height}px`,
              }}
              draggable={false}
            />
          )}

          {/* 경로 segments 폴리라인 및 포인트 SVG 레이어 */}
          <svg
            width={mapInfo.width}
            height={mapInfo.height}
            viewBox={`0 0 ${mapInfo.width} ${mapInfo.height}`}
            className="map2d-routes-svg"
          >
            {routeResult?.segments.map((seg) => {
              const polyPoints = seg.points.map((p) => `${p.x},${p.y}`).join(' ');
              const isSelectedSeg = activeSegment?.index === seg.index;

              // 현재 선택된 step이 실내 구간일 때 다른 층 segment는 흐리게 표시
              const shouldDim =
                Boolean(activeSegment?.indoor) &&
                activeSegment?.floor !== seg.floor &&
                !isSelectedSeg;

              const strokeColor = seg.isShortcut
                ? '#ea580c' // 지름길 구간 강조 색상
                : seg.indoor
                ? '#2563eb' // 실내 구간 색상
                : '#18181b'; // 실외 구간 색상

              return (
                <g
                  key={seg.index}
                  style={{ opacity: shouldDim ? 0.28 : 1 }}
                >
                  {/* 선택된 segment 외곽 하이라이트 */}
                  {isSelectedSeg && (
                    <polyline
                      points={polyPoints}
                      fill="none"
                      stroke="#fde047"
                      strokeWidth={baseStroke * 2.1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* 메인 경로 선 */}
                  <polyline
                    points={polyPoints}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={seg.isShortcut ? baseStroke * 1.25 : baseStroke}
                    strokeDasharray={
                      seg.indoor
                        ? `${baseStroke * 1.6} ${baseStroke * 1.1}`
                        : undefined
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* 경로 노드 점 표시 */}
                  {seg.points.map((pt) => (
                    <circle
                      key={`${seg.index}-${pt.nodeId}-${pt.x}-${pt.y}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={baseStroke * 0.65}
                      fill="#ffffff"
                      stroke={strokeColor}
                      strokeWidth={Math.max(2.5, baseStroke * 0.35)}
                    />
                  ))}
                </g>
              );
            })}

            {/* 현재 선택된 안내 단계(step) 위치를 나타내는 타겟 링 마커 (박스 겹침 없이 정확한 좌표 표시) */}
            {activeStep && (
              <g>
                <circle
                  cx={activeStep.position.x}
                  cy={activeStep.position.y}
                  r={baseStroke * 2.2}
                  fill="rgba(250, 204, 21, 0.28)"
                  stroke="#eab308"
                  strokeWidth={Math.max(3, baseStroke * 0.35)}
                />
                <circle
                  cx={activeStep.position.x}
                  cy={activeStep.position.y}
                  r={baseStroke * 0.9}
                  fill="#facc15"
                  stroke="#18181b"
                  strokeWidth={Math.max(2.5, baseStroke * 0.3)}
                />
              </g>
            )}
          </svg>
        </div>

        {/* 2. 화면 픽셀 직접 투영 HTML 오버레이 레이어 (확대/축소 시 위치 어긋남 0px) */}
        <div className="map2d-screen-overlay">
          {/* (A) 보조 랜드마크/출입문 라벨: 주변 라벨 켜짐 & 적당한 확대 배율일 때만 표시 */}
          {showPlaceLabels &&
            !isZoomedOut &&
            MOCK_PLACES.filter(
              (p) =>
                (p.category === 'LANDMARK' || p.category === 'ENTRANCE') &&
                p.id !== fromPlace?.id &&
                p.id !== toPlace?.id
            ).map((lm) => {
              const pos = toScreenPos(lm.position);
              return (
                <div
                  key={`lm-${lm.id}`}
                  className="map2d-landmark-chip"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    transform: `translate(-50%, -50%) scale(${uiScale})`,
                  }}
                >
                  {lm.name}
                </div>
              );
            })}

          {/* (B) 건물 마커 버튼: 축소 시에는 작은 점으로, 확대 시에는 깔끔한 이름 칩으로 표시 */}
          {showPlaceLabels &&
            buildings.map((b) => {
              const isSelected = selectedBuildingId === b.id;
              const pos = toScreenPos(b.position);

              if (isZoomedOut && !isSelected) {
                return (
                  <button
                    key={b.id}
                    type="button"
                    title={b.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBuilding(b.id);
                    }}
                    className="map2d-building-dot"
                    style={{
                      left: pos.left,
                      top: pos.top,
                    }}
                  />
                );
              }

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBuilding(b.id);
                  }}
                  className={`map2d-building-pin ${
                    isSelected ? 'map-pin-active' : ''
                  }`}
                  style={{
                    left: pos.left,
                    top: pos.top,
                    transform: `translate(-50%, -50%) scale(${uiScale})`,
                  }}
                >
                  {b.name}
                </button>
              );
            })}

          {/* (C) 지름길 구간 이름 배지: 경로 선 아래쪽(+14px)에 배치하여 도착 핀과 겹침 방지 */}
          {routeResult?.segments.map((seg) => {
            if (!seg.isShortcut || !seg.name || seg.points.length === 0) {
              return null;
            }
            const midIdx = Math.floor(seg.points.length / 2);
            const midPt =
              seg.points.length === 2
                ? {
                    x: Math.round((seg.points[0].x + seg.points[1].x) / 2),
                    y: Math.round((seg.points[0].y + seg.points[1].y) / 2),
                  }
                : seg.points[midIdx];
            const pos = toScreenPos(midPt);

            return (
              <div
                key={`shortcut-label-${seg.index}`}
                className="map2d-shortcut-badge"
                style={{
                  left: pos.left,
                  top: pos.top,
                  transform: `translate(-50%, 12px) scale(${uiScale})`,
                  transformOrigin: '50% 0%',
                }}
              >
                ★ {seg.name}
              </div>
            );
          })}

          {/* (D) 출발지 / 도착지 핀: 좌표 바로 위쪽(-10px)에 배치 */}
          {fromPlace && (
            <div
              className="map2d-endpoint-pin pin-from"
              style={{
                ...toScreenPos(fromPlace.position),
                transform: `translate(-50%, calc(-100% - 10px)) scale(${uiScale})`,
                transformOrigin: '50% 100%',
              }}
            >
              출발: {fromPlace.name}
            </div>
          )}

          {toPlace && (
            <div
              className="map2d-endpoint-pin pin-to"
              style={{
                ...toScreenPos(toPlace.position),
                transform: `translate(-50%, calc(-100% - 10px)) scale(${uiScale})`,
                transformOrigin: '50% 100%',
              }}
            >
              도착: {toPlace.name}
            </div>
          )}

          {/* (E) 중간 안내 단계(START/ARRIVE 제외) 선택 시에만 간결한 단계 태그 표시 */}
          {activeStep &&
            activeStep.action !== 'START' &&
            activeStep.action !== 'ARRIVE' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStep(activeStep.index);
                }}
                className="map2d-active-step-pin"
                style={{
                  ...toScreenPos(activeStep.position),
                  transform: `translate(-50%, calc(-100% - 12px)) scale(${uiScale})`,
                  transformOrigin: '50% 100%',
                }}
              >
                {activeStep.index + 1}단계 지점
              </button>
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
