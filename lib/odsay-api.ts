const ODSAY_BASE = "https://api.odsay.com/v1/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OdsayStation {
  stationID: number;
  stationName: string;
  x: number;
  y: number;
  stationType: number;
}

export interface OdsayLane {
  name: string;
  subwayCode: number;
  subwayExCode: number;
  type?: number;
}

export interface OdsayPassStation {
  index: number;
  stationID: number;
  stationName: string;
  x: string;
  y: string;
}

export interface OdsaySubPath {
  trafficType: number; // 1=subway, 2=bus, 3=walk
  distance?: number;
  sectionTime: number;
  stationCount?: number;
  lane?: OdsayLane[];
  startStation?: { stationID: number; stationName: string; x: number; y: number };
  endStation?: { stationID: number; stationName: string; x: number; y: number };
  passStopList?: { stations: OdsayPassStation[] };
  way?: string;
  wayCode?: number;
}

export interface OdsayPath {
  pathType: number;
  info: {
    totalTime: number;
    transferCount: number;
    totalStationCount: number;
    payment: number;
    firstStartStation: string;
    lastEndStation: string;
  };
  subPath: OdsaySubPath[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function call<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const { apiKey, ...rest } = params;
  // apiKey must not be URLSearchParams-encoded — + would become %2B and auth fails
  const qs = new URLSearchParams(rest).toString();
  const url = `${ODSAY_BASE}/${endpoint}?${qs}&apiKey=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch {
    throw new Error(`ODsay non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (data.error) {
    throw new Error(`ODsay error: ${JSON.stringify(data.error)}`);
  }
  return data.result as T;
}

export async function searchStation(name: string, apiKey: string): Promise<OdsayStation[]> {
  const result = await call<{ station?: OdsayStation[] }>("searchStation", {
    lang: "0", stationName: name, stationType: "1", apiKey,
  });
  return result.station ?? [];
}

export async function searchRoutes(
  sx: number, sy: number, ex: number, ey: number, apiKey: string
): Promise<OdsayPath[]> {
  const result = await call<{ path?: OdsayPath[] }>("searchPubTransPathT", {
    SX: String(sx), SY: String(sy), EX: String(ex), EY: String(ey),
    OPT: "0", SearchType: "2", apiKey,
  });
  return result.path ?? [];
}
