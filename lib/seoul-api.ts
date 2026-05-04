/**
 * Seoul Transit API client
 *
 * API 1: 서울특별시 대중교통환승경로 조회 서비스
 *   Base: http://ws.bus.go.kr/api/rest/pathinfo/
 *
 * API 2: 서울 실시간 지하철 도착정보
 *   Base: http://swopenapi.seoul.go.kr/api/subway/
 */

const ROUTE_API_BASE = "http://ws.bus.go.kr/api/rest/pathinfo";
const REALTIME_API_BASE = "http://swopenapi.seoul.go.kr/api/subway";

// ─── Types from the Seoul APIs ────────────────────────────────────────────────

export interface LocationItem {
  stationId: string;
  stationName: string;
  x: string; // longitude
  y: string; // latitude
  stationClass: string; // "2" = subway
}

export interface LocationInfoResponse {
  msgHeader: { headerCd: string; headerMsg: string };
  msgBody: { itemList: LocationItem[] | LocationItem };
}

export interface SubPathLane {
  name: string;
  subwayCode: number;
  startName: string;
  endName: string;
}

export interface SubPathStation {
  index: number;
  stationName: string;
  stationID: string;
  x?: string;
  y?: string;
}

export interface SubPath {
  trafficType: number; // 1=subway, 2=bus, 3=walk
  distance?: number;
  sectionTime: number;
  stationCount?: number;
  startName: string;
  endName: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  way?: string;
  wayCode?: number;
  lane?: SubPathLane[];
  passStopList?: { stations: SubPathStation[] };
}

export interface RouteItem {
  totalTime: number;
  totalTransitCount: number;
  totalStationCount: number;
  payment: number;
  subPathList: SubPath[];
}

export interface PathInfoResponse {
  msgHeader: { headerCd: string; headerMsg: string };
  msgBody: { itemList: RouteItem[] | RouteItem | null };
}

// Real-time arrival types
export interface RealtimeArrivalItem {
  subwayId: string; // line code e.g. "1002" = line 2
  subwayNm: string; // line name
  statnNm: string; // station name
  trainLineNm: string; // train destination line
  ordkey: string;
  subwayList: string;
  statnList: string;
  btrainSttus: string; // "" | "급행" | "특급"
  barvlDt: string; // seconds until arrival
  btrainNo: string;
  bstatnId: string;
  bstatnNm: string; // destination name
  recptnDt: string;
  arvlMsg2: string; // e.g. "2분30초후"
  arvlMsg3: string; // intermediate station name
  arvlCd: string; // "0"=진입, "1"=도착, "2"=출발, "3"=전역출발, "4"=전전역출발, "5"=운행중, "99"=도착예정
}

export interface RealtimeArrivalResponse {
  errorMessage: {
    status: number;
    code: string;
    message: string;
    link: string;
    developerMessage: string;
    total: number;
  };
  realtimeArrivalList?: RealtimeArrivalItem[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function ensureArray<T>(val: T[] | T | null | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Search for a station / location by name.
 * Returns items with coordinates.
 */
export async function searchLocation(
  name: string,
  routeApiKey: string
): Promise<LocationItem[]> {
  const url = `${ROUTE_API_BASE}/getLocationInfoList?ServiceKey=${encodeURIComponent(routeApiKey)}&stSrch=${encodeURIComponent(name)}&resultType=json`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Location search failed: ${res.status}`);
  const data: LocationInfoResponse = await res.json();
  if (data.msgHeader.headerCd !== "0") {
    throw new Error(`API error: ${data.msgHeader.headerMsg}`);
  }
  return ensureArray(data.msgBody?.itemList);
}

/**
 * Get subway route options between two coordinate pairs.
 */
export async function getSubwayRoutes(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  count: number = 5,
  routeApiKey: string
): Promise<RouteItem[]> {
  const params = new URLSearchParams({
    ServiceKey: routeApiKey,
    startX: String(startX),
    startY: String(startY),
    endX: String(endX),
    endY: String(endY),
    count: String(count),
    SearchPathType: "0",
    resultType: "json",
  });
  const url = `${ROUTE_API_BASE}/getPathInfoBySubwayList?${params}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Route search failed: ${res.status}`);
  const data: PathInfoResponse = await res.json();
  if (data.msgHeader.headerCd !== "0") {
    throw new Error(`API error: ${data.msgHeader.headerMsg}`);
  }
  return ensureArray(data.msgBody?.itemList);
}

/**
 * Get real-time arrivals for a station.
 * stationName should be the Korean name e.g. "강동"
 */
export async function getRealtimeArrivals(
  stationName: string,
  realtimeApiKey: string
): Promise<RealtimeArrivalItem[]> {
  const url = `${REALTIME_API_BASE}/${realtimeApiKey}/json/realtimeStationArrival/0/30/${encodeURIComponent(stationName)}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Realtime arrivals failed: ${res.status}`);
  const data: RealtimeArrivalResponse = await res.json();
  if (data.errorMessage?.status !== 200) {
    // Non-fatal: some stations may not have real-time data
    return [];
  }
  return data.realtimeArrivalList ?? [];
}

/**
 * Given the real-time arrivals for a station and a target subway line code,
 * return the minimum wait in minutes for the next train on that line.
 */
export function findMinWaitMinutes(
  arrivals: RealtimeArrivalItem[],
  subwayCode: number,
  directionWayCode?: number
): number | null {
  // subwayId in the API is like "1001" for line 1, "1002" for line 2, etc.
  // The route API uses subwayCode 1-9 and 101/104/109/110
  // Mapping: 1→1001, 2→1002, 3→1003, 4→1004, 5→1005, 6→1006, 7→1007, 8→1008, 9→1009
  //          101→1065(공항), 104→1077(경의중앙), 109→1075(수인분당), 110→1067(신분당)
  const lineCodeMap: Record<number, string> = {
    1: "1001",
    2: "1002",
    3: "1003",
    4: "1004",
    5: "1005",
    6: "1006",
    7: "1007",
    8: "1008",
    9: "1009",
    101: "1065",
    104: "1077",
    109: "1075",
    110: "1067",
  };
  const targetId = lineCodeMap[subwayCode];
  if (!targetId) return null;

  const matching = arrivals.filter((a) => a.subwayId === targetId);
  if (matching.length === 0) return null;

  // barvlDt is seconds until arrival
  const seconds = matching
    .map((a) => parseInt(a.barvlDt, 10))
    .filter((s) => !isNaN(s) && s >= 0)
    .sort((a, b) => a - b);

  if (seconds.length === 0) return null;
  return Math.ceil(seconds[0] / 60);
}
