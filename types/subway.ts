export interface Station {
  id: string;
  name: string; // Korean name e.g. "상일동"
  nameEn: string; // English name
  line: string; // "5" | "3" | "2" etc
  lineColor: string; // hex color
  transfers: string[]; // station IDs at same physical location (different lines)
  branchTransfers?: string[]; // same line but different branch (like 강동 Line 5)
  adjacent: Array<{ stationId: string; time: number }>; // minutes to adjacent stations
}

export interface Route {
  totalMinutes: number;
  transferCount: number;
  stationCount: number;
  cost: number; // KRW
  segments: RouteSegment[];
  label?: "최단시간" | "최소환승" | "최소비용";
}

export interface RouteSegment {
  line: string;
  lineColor: string;
  direction: string; // e.g. "방화행"
  fromStation: Station;
  toStation: Station;
  stops: Station[]; // intermediate stops
  departureTime?: Date;
  arrivalTime?: Date;
  realtimeDepartureMin?: number; // minutes until departure (from real-time API)
  walkSeconds?: number; // transfer walking time
  waitMinutes?: number; // wait for next train
}

export interface RealtimeArrival {
  stationName: string;
  line: string;
  direction: string; // destination
  arrivalMinutes: number; // minutes until arrival (0=soon, 1=1min, etc)
  arrivalMessage: string; // e.g. "2분30초후"
  trainId: string;
  subwayId?: string;
  ordkey?: string;
  isExpress?: boolean;
}

export interface TransferInfo {
  stationId: string;
  stationName: string;
  walkSeconds: number;
  waitMinutes: number;
  realtimeArrival?: RealtimeArrival;
}

export interface SearchParams {
  from: string;
  to: string;
}

export interface RouteFinderResponse {
  routes: Route[];
  searchTime: Date;
  fromStation: Station;
  toStation: Station;
  isRealtimeData: boolean;
  error?: string;
}
