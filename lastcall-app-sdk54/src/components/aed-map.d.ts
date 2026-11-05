import type { ComponentType } from "react";

export type AedMapItem = {
  serialSeq: string;
  org: string;
  place: string;
  latitude: number;
  longitude: number;
  distance: number;
  openNow: boolean | null;
};

export type AedMapProps = {
  aeds: AedMapItem[];
  center: { latitude: number; longitude: number };
  /** 현재 위치를 실제로 확인했는지. 기준점이 임시 좌표면 현재 위치 마커를 그리지 않는다. */
  hasLocation: boolean;
  onSelect: (aed: AedMapItem) => void;
};

declare const AedMap: ComponentType<AedMapProps>;
export default AedMap;
