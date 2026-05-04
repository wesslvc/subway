// Types exported for client component use
// Actual route fetching is done client-side via lib/odsay-client.ts

export interface ClientSubPath {
  trafficType: number; // 1=subway, 3=walk
  sectionTime: number;
  stationCount?: number;
  startName: string;
  endName: string;
  lineName?: string;
  lineCode?: number;
  lineColor?: string;
  direction?: string;
  stations?: { index: number; name: string; id: string }[];
  realtimeWaitMinutes?: number | null;
  realtimeArrivalMsg?: string;
}

export interface ClientRoute {
  totalMinutes: number;
  adjustedTotalMinutes: number;
  transferCount: number;
  stationCount: number;
  cost: number;
  segments: ClientSubPath[];
  label?: string;
  isRealtimeEnhanced: boolean;
}

export interface FindRouteResponse {
  routes: ClientRoute[];
  fromName: string;
  toName: string;
  searchTime: string;
  isRealtimeData: boolean;
  error?: string;
}
