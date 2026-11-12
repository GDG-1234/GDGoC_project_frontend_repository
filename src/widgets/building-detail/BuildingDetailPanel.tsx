import React from 'react';
import { BuildingDetailResponse } from '../../shared/types/api';

interface BuildingDetailPanelProps {
  building: BuildingDetailResponse | null;
  onClose: () => void;
  onSetAsFrom: (buildingName: string) => void;
  onSetAsTo: (buildingName: string) => void;
}

export const BuildingDetailPanel: React.FC<BuildingDetailPanelProps> = ({
  building,
  onClose,
  onSetAsFrom,
  onSetAsTo,
}) => {
  if (!building) return null;

  return (
    <div className="building-detail-drawer" role="region" aria-label="건물 상세 정보">
      <div className="detail-header">
        <div>
          <strong>{building.name}</strong>
          {building.aliases.length > 0 && (
            <span className="building-alias-text">
              ({building.aliases.join(', ')})
            </span>
          )}
        </div>
        <div className="building-drawer-actions">
          <button
            type="button"
            className="strip-btn"
            onClick={() => onSetAsFrom(building.name)}
          >
            출발지로 지정
          </button>
          <button
            type="button"
            className="strip-btn"
            onClick={() => onSetAsTo(building.name)}
          >
            도착지로 지정
          </button>
          <button type="button" className="strip-btn" onClick={onClose}>
            닫기 ✕
          </button>
        </div>
      </div>

      <div className="building-detail-grid">
        <table className="data-table">
          <tbody>
            <tr>
              <th>픽셀 좌표</th>
              <td className="mono-cell">
                ({building.position.x}, {building.position.y})
              </td>
            </tr>
            <tr>
              <th>전화번호</th>
              <td>{building.phone || '-'}</td>
            </tr>
            <tr>
              <th>운영 시간</th>
              <td>{building.operatingHours || '-'}</td>
            </tr>
            <tr>
              <th>보유 층</th>
              <td>
                {building.floors.map((f) => f.label).join(' · ') || '정보 없음'}
              </td>
            </tr>
            <tr>
              <th>편의시설</th>
              <td>
                {building.facilities.length === 0
                  ? '등록된 편의시설 없음'
                  : building.facilities
                      .map((fac) => `${fac.name}(${fac.floorDescription})`)
                      .join(' · ')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
