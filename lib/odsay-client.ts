"use client";

const ODSAY_BASE = "https://api.odsay.com/v1/api";

// 지하철 노선 색상 (ODsay 공식 subwayCode 기준)
const LINE_COLORS: Record<number, string> = {
  1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A4E3",
  5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
  100: "#7CA8D5", 101: "#F5A200", 102: "#0C8E72", 103: "#77C4A3",
  104: "#76C624", 105: "#003DA5", 106: "#FABE00", 107: "#76C624",
  108: "#D4003B", 109: "#B0CE18", 110: "#8BCBC8", 111: "#AD8605", 112: "#FABE00",
};

// ─── 공유 타입 ─────────────────────────────────────────────────────────────────

export interface ClientSubPath {
  trafficType: number; // 1=지하철, 3=환승
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

// 실시간 조회용 환승 정보
export interface TransferPoint {
  stationName: string; // 환승 후 탑승역
  lineCode: number;    // 환승 후 탑승 노선 (ODsay subwayCode)
  walkMinutes: number; // 환승 도보 시간
}

export type RealtimeArrivals = Record<string, { subwayId: string; waitMinutes: number; msg: string }[]>;

// ─── ODsay 내부 타입 ──────────────────────────────────────────────────────────

interface OdsayStation { stationID: number; stationName: string; x: number; y: number }

interface OdsaySubPath {
  trafficType: number; // 1=지하철, 2=버스, 3=도보
  sectionTime: number;
  stationCount?: number;
  lane?: { name: string; subwayCode: number }[];
  startName?: string;
  endName?: string;
  startStation?: { stationID: number; stationName: string };
  endStation?: { stationID: number; stationName: string };
  passStopList?: { stations: { index: number; stationID: number; stationName: string }[] };
  way?: string;
}

interface OdsayPath {
  pathType: number; // 1=지하철전용
  info: { totalTime: number; payment: number; firstStartStation: string; lastEndStation: string };
  subPath: OdsaySubPath[];
}

// ─── ODsay API 호출 ───────────────────────────────────────────────────────────

async function odsayGet<T>(endpoint: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${ODSAY_BASE}/${endpoint}?${qs}&apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ODsay HTTP ${res.status}`);
  const data = await res.json() as { result?: T; error?: unknown };
  if (data.error) throw new Error(`ODsay: ${JSON.stringify(data.error)}`);
  if (!data.result) throw new Error("ODsay: 응답 없음");
  return data.result;
}

// 역명 검색 — "역" 접미사 제거 후 검색, 정확 매칭 우선
export async function odsaySearchStation(name: string, apiKey: string): Promise<OdsayStation[]> {
  const q = name.endsWith("역") ? name.slice(0, -1) : name;
  const r = await odsayGet<{ station?: OdsayStation[] }>(
    "searchStation", { lang: "0", stationName: q, stationType: "1" }, apiKey
  );
  const stations = r.station ?? [];
  const exact = stations.filter((s) => s.stationName === q);
  const starts = stations.filter((s) => s.stationName !== q && s.stationName.startsWith(q));
  const rest = stations.filter((s) => !s.stationName.startsWith(q));
  return [...exact, ...starts, ...rest];
}

// 지하철 전용 경로 탐색 (pathType === 1 만)
export async function odsaySearchRoutes(sx: number, sy: number, ex: number, ey: number, apiKey: string): Promise<OdsayPath[]> {
  const r = await odsayGet<{ path?: OdsayPath[] }>(
    "searchPubTransPathT",
    { SX: String(sx), SY: String(sy), EX: String(ex), EY: String(ey), OPT: "0", SearchType: "0" },
    apiKey
  );
  return (r.path ?? []).filter((p) => p.pathType === 1).slice(0, 5);
}

// ─── 환승역 수집 ──────────────────────────────────────────────────────────────

// subPath에서 연속된 지하철 구간 사이의 환승 도보만 추출
// 출발지→역 도보 / 역→목적지 도보는 제외
export function collectTransferPoints(paths: OdsayPath[]): TransferPoint[] {
  const seen = new Set<string>();
  const points: TransferPoint[] = [];

  for (const path of paths) {
    const subPaths = path.subPath;
    for (let i = 0; i < subPaths.length; i++) {
      if (subPaths[i].trafficType !== 3) continue;

      const hasPrevSubway = subPaths.slice(0, i).some((s) => s.trafficType === 1);
      const nextSubway = subPaths.slice(i + 1).find((s) => s.trafficType === 1);
      if (!hasPrevSubway || !nextSubway) continue; // 출발/도착 도보는 무시

      const stationName = nextSubway.startStation?.stationName ?? nextSubway.startName ?? "";
      const lineCode = nextSubway.lane?.[0]?.subwayCode ?? 0;
      const key = `${stationName}:${lineCode}`;
      if (stationName && lineCode && !seen.has(key)) {
        seen.add(key);
        points.push({ stationName, lineCode, walkMinutes: subPaths[i].sectionTime });
      }
    }
  }
  return points;
}

// ─── ODsay 경로 → ClientRoute 변환 ───────────────────────────────────────────

export function odsayPathsToClientRoutes(paths: OdsayPath[], arrivals: RealtimeArrivals): ClientRoute[] {
  const routes = paths.map((path) => {
    const segments: ClientSubPath[] = [];
    let adjustedTotal = 0;
    let isRealtimeEnhanced = false;

    const subPaths = path.subPath;

    for (let i = 0; i < subPaths.length; i++) {
      const sp = subPaths[i];

      if (sp.trafficType === 1) {
        // 지하철 구간
        const lane = sp.lane?.[0];
        const code = lane?.subwayCode ?? 0;
        segments.push({
          trafficType: 1,
          sectionTime: sp.sectionTime,
          stationCount: sp.stationCount,
          startName: sp.startStation?.stationName ?? sp.startName ?? "",
          endName: sp.endStation?.stationName ?? sp.endName ?? "",
          lineName: lane?.name,
          lineCode: code,
          lineColor: LINE_COLORS[code] ?? "#888",
          direction: sp.way,
          stations: sp.passStopList?.stations.map((s) => ({
            index: s.index, name: s.stationName, id: String(s.stationID),
          })),
        });
        adjustedTotal += sp.sectionTime;

      } else if (sp.trafficType === 3) {
        // 도보 구간 — 앞뒤로 지하철이 있는 경우만 환승 처리
        const hasPrevSubway = subPaths.slice(0, i).some((s) => s.trafficType === 1);
        const nextSubway = subPaths.slice(i + 1).find((s) => s.trafficType === 1);
        if (!hasPrevSubway || !nextSubway) continue; // 출발/도착 도보 스킵

        const stationName = nextSubway.startStation?.stationName ?? nextSubway.startName ?? "";
        const lineCode = nextSubway.lane?.[0]?.subwayCode ?? 0;
        // ODsay subwayCode → 실시간 API subwayId 변환 (1→"1001", 2→"1002", ...)
        const subwayId = `1${String(lineCode).padStart(3, "0")}`;
        const walkMin = sp.sectionTime;

        let realtimeWait: number | null = null;
        let realtimeMsg: string | undefined;

        const stationArrivals = arrivals[stationName] ?? [];
        const match = stationArrivals.find((a) => a.subwayId === subwayId);
        if (match) {
          realtimeWait = match.waitMinutes;
          realtimeMsg = match.msg;
          isRealtimeEnhanced = true;
        }

        const waitMin = realtimeWait ?? 3;
        adjustedTotal += walkMin + waitMin;

        segments.push({
          trafficType: 3,
          sectionTime: walkMin,
          startName: segments.at(-1)?.endName ?? "",
          endName: stationName,
          realtimeWaitMinutes: realtimeWait,
          realtimeArrivalMsg: realtimeMsg,
        });
      }
      // trafficType === 2 (버스) 완전 무시
    }

    const subwaySegs = subPaths.filter((s) => s.trafficType === 1);
    const transferCount = Math.max(0, subwaySegs.length - 1);
    const stationCount = subwaySegs.reduce((sum, s) => sum + (s.stationCount ?? 0), 0);

    return {
      totalMinutes: path.info.totalTime,
      adjustedTotalMinutes: Math.round(adjustedTotal),
      transferCount,
      stationCount,
      cost: path.info.payment,
      segments,
      isRealtimeEnhanced,
    } satisfies Omit<ClientRoute, "label">;
  });

  routes.sort((a, b) => a.adjustedTotalMinutes - b.adjustedTotalMinutes);
  const labeled = routes as ClientRoute[];
  if (labeled.length > 0) labeled[0].label = "최단시간";
  const minT = Math.min(...labeled.map((r) => r.transferCount));
  const lt = labeled.find((r) => r.transferCount === minT && !r.label);
  if (lt) lt.label = "최소환승";
  const minC = Math.min(...labeled.map((r) => r.cost));
  const lc = labeled.find((r) => r.cost === minC && !r.label);
  if (lc) lc.label = "최소비용";
  return labeled;
}
