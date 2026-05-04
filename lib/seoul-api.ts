/**
 * Seoul Transit API client
 *
 * API 1: 서울특별시 대중교통환승경로 조회 서비스
 *   Base: http://openapi.seoul.go.kr:8088/{KEY}/json/{SERVICE}/{start}/{end}/{params}/
 *
 * API 2: 서울 실시간 지하철 도착정보
 *   Base: http://swopenapi.seoul.go.kr/api/subway/{KEY}/json/realtimeStationArrival/0/30/{station}
 */

const ROUTE_API_BASE = "http://openapi.seoul.go.kr:8088";
const REALTIME_API_BASE = "http://swopenapi.seoul.go.kr/api/subway";

// ─── Types from the Seoul APIs ────────────────────────────────────────────────

export interface LocationItem {
  stationId: string;
  stationName: string;
  x: string; // longitude
  y: string; // latitude
  stationClass: string; // "2" = subway
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

// Real-time arrival types
export interface RealtimeArrivalItem {
  subwayId: string; // line code e.g. "1002" = line 2
  subwayNm: string;
  statnNm: string;
  trainLineNm: string;
  btrainSttus: string; // "" | "급행" | "특급"
  barvlDt: string; // seconds until arrival
  btrainNo: string;
  bstatnId: string;
  bstatnNm: string;
  recptnDt: string;
  arvlMsg2: string; // e.g. "2분30초후"
  arvlMsg3: string;
  arvlCd: string;
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
 * Parse the openapi.seoul.go.kr response envelope.
 * Response shape: { "ServiceName": { "RESULT": { "CODE": "INFO-000" }, "row": [...] } }
 */
function parseSeoulResponse<T>(data: Record<string, unknown>, serviceName: string): T[] {
  const svc = data[serviceName] as Record<string, unknown> | undefined;
  if (!svc) {
    // Try to detect error response
    const keys = Object.keys(data);
    const firstKey = keys[0];
    if (firstKey) {
      const inner = data[firstKey] as Record<string, unknown>;
      const result = inner?.RESULT as Record<string, string> | undefined;
      if (result?.CODE && result.CODE !== "INFO-000") {
        throw new Error(`Seoul API error: ${result.CODE} - ${result.MESSAGE ?? ""}`);
      }
    }
    throw new Error(`Unexpected response shape, keys: ${Object.keys(data).join(", ")}`);
  }

  const result = svc.RESULT as Record<string, string> | undefined;
  if (result?.CODE && result.CODE !== "INFO-000") {
    throw new Error(`Seoul API error: ${result.CODE} - ${result.MESSAGE ?? ""}`);
  }

  return ensureArray(svc.row as T[] | T | null | undefined);
}

/**
 * Search for a station / location by name.
 */
export async function searchLocation(
  name: string,
  routeApiKey: string
): Promise<LocationItem[]> {
  const url = `${ROUTE_API_BASE}/${routeApiKey}/json/getLocationInfoList/1/10/${encodeURIComponent(name)}/`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Location search HTTP ${res.status}: ${text.slice(0, 200)}`);
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch {
    throw new Error(`Location search returned non-JSON: ${text.slice(0, 200)}`);
  }
  return parseSeoulResponse<LocationItem>(data, "getLocationInfoList");
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
  const url = `${ROUTE_API_BASE}/${routeApiKey}/json/getPathInfoBySubwayList/1/${count}/${startX}/${startY}/${endX}/${endY}/`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Route search HTTP ${res.status}: ${text.slice(0, 200)}`);
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch {
    throw new Error(`Route search returned non-JSON: ${text.slice(0, 200)}`);
  }
  const rows = parseSeoulResponse<Record<string, unknown>>(data, "getPathInfoBySubwayList");

  // Normalize row format: the API may return subPaths as nested JSON string or array
  return rows.map((row) => normalizeRouteRow(row));
}

function normalizeRouteRow(row: Record<string, unknown>): RouteItem {
  let subPathList: SubPath[] = [];

  // The API may provide subPath as a JSON string, an array, or subPathList directly
  if (Array.isArray(row.subPathList)) {
    subPathList = row.subPathList as SubPath[];
  } else if (Array.isArray(row.subPath)) {
    subPathList = row.subPath as SubPath[];
  } else if (typeof row.subPath === "string") {
    try { subPathList = JSON.parse(row.subPath) as SubPath[]; } catch { /* ignore */ }
  } else if (typeof row.subPathList === "string") {
    try { subPathList = JSON.parse(row.subPathList) as SubPath[]; } catch { /* ignore */ }
  }

  // Normalize lanes: may be nested differently
  subPathList = subPathList.map((sp) => {
    const spAny = sp as unknown as Record<string, unknown>;
    let lane = sp.lane;
    if (!lane && spAny.lanes) {
      lane = ensureArray(spAny.lanes as SubPathLane[]);
    }
    let passStopList = sp.passStopList;
    if (!passStopList && spAny.passStopListObj) {
      passStopList = spAny.passStopListObj as { stations: SubPathStation[] };
    }
    return { ...sp, lane: lane ? ensureArray(lane) : undefined, passStopList };
  });

  return {
    totalTime: Number(row.totalTime ?? 0),
    totalTransitCount: Number(row.totalTransitCount ?? 0),
    totalStationCount: Number(row.totalStationCount ?? 0),
    payment: Number(row.payment ?? 0),
    subPathList,
  };
}

/**
 * Get real-time arrivals for a station.
 */
export async function getRealtimeArrivals(
  stationName: string,
  realtimeApiKey: string
): Promise<RealtimeArrivalItem[]> {
  const url = `${REALTIME_API_BASE}/${realtimeApiKey}/json/realtimeStationArrival/0/30/${encodeURIComponent(stationName)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Realtime arrivals HTTP ${res.status}`);
  const data: RealtimeArrivalResponse = await res.json();
  if (data.errorMessage?.status !== 200) return [];
  return data.realtimeArrivalList ?? [];
}

/**
 * Given real-time arrivals for a station and a target subway line code,
 * return the minimum wait in minutes for the next train on that line.
 */
export function findMinWaitMinutes(
  arrivals: RealtimeArrivalItem[],
  subwayCode: number,
  _directionWayCode?: number
): number | null {
  const lineCodeMap: Record<number, string> = {
    1: "1001", 2: "1002", 3: "1003", 4: "1004", 5: "1005",
    6: "1006", 7: "1007", 8: "1008", 9: "1009",
    101: "1065", 104: "1077", 109: "1075", 110: "1067",
  };
  const targetId = lineCodeMap[subwayCode];
  if (!targetId) return null;

  const matching = arrivals.filter((a) => a.subwayId === targetId);
  if (matching.length === 0) return null;

  const seconds = matching
    .map((a) => parseInt(a.barvlDt, 10))
    .filter((s) => !isNaN(s) && s >= 0)
    .sort((a, b) => a - b);

  if (seconds.length === 0) return null;
  return Math.ceil(seconds[0] / 60);
}
