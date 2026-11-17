import React from 'react';
import { BuildingDetailResponse } from '../../shared/types/api';
import { Icon } from '../../shared/ui/Icon';

interface BuildingDetailPanelProps {
  building: BuildingDetailResponse | null;
  onClose: () => void;
  onSetAsFrom: (buildingId: number, buildingName: string) => void;
  onSetAsTo: (buildingId: number, buildingName: string) => void;
}

export const BuildingDetailPanel: React.FC<BuildingDetailPanelProps> = ({
  building,
  onClose,
  onSetAsFrom,
  onSetAsTo,
}) => {
  if (!building) return null;

  const floorsText =
    building.floors.map((f) => f.label).join(' · ') || '정보 없음';
  const facilitiesText =
    building.facilities.length === 0
      ? '등록된 편의시설 없음'
      : building.facilities
          .map((fac) => `${fac.name}(${fac.floorDescription})`)
          .join(' · ');

  return (
    <div
      className="route-summary building-summary"
      role="region"
      aria-label="건물 상세 정보"
    >
      <div className="building-summary-top">
        <div className="route-title">
          <span className="route-number" aria-hidden="true">
            <Icon name="pin" size={16} />
          </span>
          <div>
            <strong>
              {building.name}
              {building.aliases.length > 0 && (
                <span className="building-alias-text">
                  ({building.aliases.join(', ')})
                </span>
              )}
            </strong>
            <p>
              운영 {building.operatingHours || '-'} · 연락처{' '}
              {building.phone || '-'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="건물 상세 닫기"
        >
          <Icon name="close" size={17} />
        </button>
      </div>

      <div className="building-summary-specs">
        <div>
          <span>보유 층</span>
          <strong>{floorsText}</strong>
        </div>
        <div>
          <span>편의시설</span>
          <strong>{facilitiesText}</strong>
        </div>
      </div>

      <div className="building-summary-actions">
        <button
          type="button"
          className="building-action-btn"
          onClick={() => onSetAsFrom(building.id, building.name)}
        >
          출발지로 지정
        </button>
        <button
          type="button"
          className="building-action-btn primary"
          onClick={() => onSetAsTo(building.id, building.name)}
        >
          도착지로 지정
        </button>
      </div>
    </div>
  );
};
