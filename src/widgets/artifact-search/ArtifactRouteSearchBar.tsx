import React, { useEffect, useRef, useState } from 'react';
import { formatFloorLabel, searchPlaces } from '../../shared/api/apiClient';
import { PlaceSummary } from '../../shared/types/api';
import { Icon } from '../../shared/ui/Icon';

interface ArtifactRouteSearchBarProps {
  fromPlace: PlaceSummary | null;
  toPlace: PlaceSummary | null;
  onSelectFrom: (place: PlaceSummary) => void;
  onSelectTo: (place: PlaceSummary) => void;
  onSwapPlaces: () => void;
}

interface PlaceSearchInputProps {
  label: string;
  placeholder: string;
  selectedPlace: PlaceSummary | null;
  onSelectPlace: (place: PlaceSummary) => void;
}

const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  label,
  placeholder,
  selectedPlace,
  onSelectPlace,
}) => {
  const [query, setQuery] = useState(selectedPlace?.name ?? '');
  const [results, setResults] = useState<PlaceSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const reqSeqRef = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(selectedPlace?.name ?? '');
  }, [selectedPlace]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const scheduleSearch = (nextQuery: string) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    const trimmed = nextQuery.trim();
    if (!trimmed) {
      reqSeqRef.current += 1;
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = window.setTimeout(async () => {
      const seq = ++reqSeqRef.current;
      try {
        const res = await searchPlaces({ q: trimmed, limit: 8 });
        if (seq !== reqSeqRef.current) return;
        setResults(res.items);
      } catch {
        if (seq !== reqSeqRef.current) return;
        setResults([]);
      } finally {
        if (seq === reqSeqRef.current) {
          setIsSearching(false);
        }
      }
    }, 300);
  };

  const handleChange = (next: string) => {
    setQuery(next);
    setIsOpen(true);
    scheduleSearch(next);
  };

  const handlePick = (item: PlaceSummary) => {
    setQuery(item.name);
    setIsOpen(false);
    setResults([]);
    onSelectPlace(item);
  };

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div className="route-search-field">
      <span className="route-search-tag">{label}</span>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        aria-label={`${label} 장소 검색`}
        onFocus={() => {
          if (blurTimerRef.current !== null) {
            window.clearTimeout(blurTimerRef.current);
          }
          setIsOpen(true);
          if (query.trim() && results.length === 0) {
            scheduleSearch(query);
          }
        }}
        onBlur={() => {
          blurTimerRef.current = window.setTimeout(() => {
            setIsOpen(false);
          }, 140);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpen(false);
          } else if (e.key === 'Enter' && results.length > 0) {
            e.preventDefault();
            handlePick(results[0]);
          }
        }}
        onChange={(e) => handleChange(e.target.value)}
      />

      {showDropdown && (
        <ul className="route-search-dropdown" role="listbox" aria-label={`${label} 검색 결과`}>
          {isSearching ? (
            <li className="route-search-status">검색 중...</li>
          ) : results.length === 0 ? (
            <li className="route-search-status">일치하는 장소가 없습니다.</li>
          ) : (
            results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedPlace?.id === item.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(item)}
                >
                  <span className="route-search-item-name">{item.name}</span>
                  <span className="route-search-item-meta">
                    {item.buildingName ? `${item.buildingName} · ` : ''}
                    {formatFloorLabel(item.floor)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export const ArtifactRouteSearchBar: React.FC<ArtifactRouteSearchBarProps> = ({
  fromPlace,
  toPlace,
  onSelectFrom,
  onSelectTo,
  onSwapPlaces,
}) => {
  return (
    <div className="artifact-search-bar" role="region" aria-label="출발·도착지 검색">
      <PlaceSearchInput
        label="출발"
        placeholder="출발 장소 검색 (예: 정문, 혜화관)"
        selectedPlace={fromPlace}
        onSelectPlace={onSelectFrom}
      />

      <button
        type="button"
        className="route-swap-btn"
        onClick={onSwapPlaces}
        disabled={!fromPlace && !toPlace}
        aria-label="출발지와 도착지 바꾸기"
        title="출발·도착 맞바꾸기"
      >
        <Icon name="swap" size={15} />
      </button>

      <PlaceSearchInput
        label="도착"
        placeholder="도착 장소 검색 (예: 신공학관 3층)"
        selectedPlace={toPlace}
        onSelectPlace={onSelectTo}
      />
    </div>
  );
};
