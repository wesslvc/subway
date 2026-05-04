"use client";

const ODSAY_BASE = "https://api.odsay.com/v1/api";

// ODsay 지하철 노선 코드 → 색상 (공식 문서 기준)
const LINE_COLORS: Record<number, string> = {
  1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A4E3",
  5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
  100: "#7CA8D5", // 인천1호선
  101: "#F5A200", // 인천2호선
  102: "#0C8E72", // 경춘선
  103: "#77C4A3", // 경의중앙선
  104: "#76C624", // 공항철도
  105: "#003DA5", // 경강선
  106: "#FABE00", // 의정부경전철
  107: "#76C624", // 에버라인
  108: "#D4003B", // 신분당선
  109: "#B0CE18", // 우이신설선
  110: "#8BCBC8", // 서해선
  111: "#AD8605", // 김포골드라인
  112: "#FABE00", // 수인분당선
};

// ─── 공유 타입 ─────────────────────────────────────────────────────────────────

export interface ClientSubPath {
  trafficType: number; // 1=지하철, 3=도보/환승
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

export type RealtimeArrivals = Record<string, { subwayId: string; waitMinutes: number; msg: string }[]>;

// ─── ODsay 내부 타입 ──────────────────────────────────────────────────────────

interface OdsayStation {
  stationID: number;
  stationName: string;
  x: number;
  y: number;
}

interface OdsaySubPath {
  trafficType: number; // 1=지하철, 2=버스, 3=도보
  sectionTime: number;
  stationCount?: number;
  lane?: { name: string; subwayCode: number }[];
  startName?: string;
  endName?: string;
  startStation?: { stationID: number; stationName: string; x: number; y: number };
  endStation?: { stationID: number; stationName: string; x: number; y: number };
  passStopList?: { stations: { index: number; stationID: number; stationName: string }[] };
  way?: string;
}

interface OdsayPath {
  pathType: number; // 1=지하철, 2=버스, 3=복합
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

// ─── ODsay API 호출 (브라우저 — Origin 헤더 자동 전송) ────────────────────────

async function odsayGet<T>(endpoint: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${ODSAY_BASE}/${endpoint}?${qs}&apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ODsay HTTP ${res.status}`);
  const data = await res.json() as { result?: T; error?: unknown };
  if (data.error) throw new Error(`ODsay: ${JSON.stringify(data.error)}`);
  if (!data.result) throw new Error("ODsay: 응답 데이터가 없습니다");
  return data.result;
}

export async function odsaySearchStation(name: string, apiKey: string): Promise<OdsayStation[]> {
  // ODsay 역명 DB에는 "역" 접미사 없음. "잠실역" → "잠실" 로 검색
  const searchName = name.endsWith("역") ? name.slice(0, -1) : name;
  const r = await odsayGet<{ station?: OdsayStation[] }>(
    "searchStation", { lang: "0", stationName: searchName, stationType: "1" }, apiKey
  );
  const stations = r.station ?? [];
  if (stations.length === 0) return [];

  // 정확히 일치하는 역 우선, 그 다음 시작하는 역, 그 다음 나머지
  const exact = stations.filter((s) => s.stationName === searchName);
  const starts = stations.filter((s) => s.stationName.startsWith(searchName) && s.stationName !== searchName);
  const rest = stations.filter((s) => !s.stationName.startsWith(searchName));
  return [...exact, ...starts, ...rest];
}

export async function odsaySearchRoutes(
  sx: number, sy: number, ex: number, ey: number, apiKey: string
): Promise<OdsayPath[]> {
  const r = await odsayGet<{ path?: OdsayPath[] }>(
    "searchPubTransPathT",
    { SX: String(sx), SY: String(sy), EX: String(ex), EY: String(ey), OPT: "0", SearchType: "0" },
    apiKey
  );
  // pathType 1 = 지하철 전용만 허용 (버스 완전 제외)
  const paths = (r.path ?? []).filter((p) => p.pathType === 1);
  return paths.slice(0, 5);
}

// ─── 실시간 대기시간 조회 대상 역 수집 ───────────────────────────────────────

export function collectTransferStations(paths: OdsayPath[]): string[] {
  const stations = new Set<string>();
  for (const path of paths) {
    const subPaths = path.subPath;
    for (let i = 0; i < subPaths.length; i++) {
      const sp = subPaths[i];
      if (sp.trafficType !== 3) continue;

      // 앞뒤에 지하철 구간이 있는 경우만 진짜 환승 도보
      const hasPrevSubway = subPaths.slice(0, i).some((s) => s.trafficType === 1);
      const nextSubway = subPaths.slice(i + 1).find((s) => s.trafficType === 1);
      if (hasPrevSubway && nextSubway?.startStation?.stationName) {
        stations.add(nextSubway.startStation.stationName);
      }
    }
  }
  return Array.from(stations);
}

// ─── ODsay 경로 → ClientRoute 변환 ───────────────────────────────────────────

export function odsayPathsToClientRoutes(paths: OdsayPath[], arrivals: RealtimeArrivals): ClientRoute[] {
  const routes = paths.map((path) => {
    const segments: ClientSubPath[] = [];
    let adjustedTotal = 0;
    let isRealtimeEnhanced = false;

    for (let i = 0; i < path.subPath.length; i++) {
      const sp = path.subPath[i];

      if (sp.trafficType === 1) {
        // ── 지하철 구간 ──────────────────────────────────────────
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
        // ── 도보 구간 ────────────────────────────────────────────
        const hasPrevSubway = path.subPath.slice(0, i).some((s) => s.trafficType === 1);
        const nextSubway = path.subPath.slice(i + 1).find((s) => s.trafficType === 1);

        // 앞뒤로 지하철 구간이 있는 경우만 실제 환승 (첫 도보·마지막 도보 제외)
        const isTransfer = hasPrevSubway && nextSubway != null;

        let realtimeWait: number | null = null;
        let realtimeMsg: string | undefined;

        if (isTransfer && nextSubway.startStation?.stationName) {
          const boardingStation = nextSubway.startStation.stationName;
          const code = nextSubway.lane?.[0]?.subwayCode ?? 0;
          // ODsay subwayCode → 실시간 API subwayId (1→"1001", 2→"1002", ...)
          const targetId = `1${String(code).padStart(3, "0")}`;
          const match = (arrivals[boardingStation] ?? []).find((a) => a.subwayId === targetId);
          if (match) {
            realtimeWait = match.waitMinutes;
            realtimeMsg = match.msg;
            isRealtimeEnhanced = true;
          }
        }

        // 도보 구간 표시 (환승이든 아니든 도보 시간은 포함)
        const walkMin = sp.sectionTime;
        adjustedTotal += walkMin;

        // 환승 대기시간은 실제 환승 구간에만 추가
        if (isTransfer) {
          const waitMin = realtimeWait ?? 3; // 실시간 없으면 기본 3분
          adjustedTotal += waitMin;

          segments.push({
            trafficType: 3,
            sectionTime: walkMin,
            startName: segments.at(-1)?.endName ?? "",
            endName: nextSubway.startStation?.stationName ?? "",
            realtimeWaitMinutes: realtimeWait,
            realtimeArrivalMsg: realtimeMsg,
          });
        }
        // 첫 도보(출발지→역) / 마지막 도보(역→목적지)는 segments에 추가 안 함
      }
    }

    // API의 transferCount/totalStationCount 대신 실제 subPath에서 계산 (더 정확)
    const subwaySegs = path.subPath.filter((s) => s.trafficType === 1);
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
