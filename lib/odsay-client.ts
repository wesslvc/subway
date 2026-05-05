"use client";

const ODSAY_BASE = "https://api.odsay.com/v1/api";

// ─── 노선 색상 (Odsay subwayCode 기준) ───────────────────────────────────────
const LINE_COLORS: Record<number, string> = {
  1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A5DE",
  5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
  91: "#9A6292",  // GTX-A
  101: "#0090D2", // 공항철도
  104: "#77C4A3", // 경의중앙선
  108: "#0C8E72", // 경춘선
  109: "#D4003B", // 신분당선
  113: "#B0CE18", // 우이신설선
  116: "#F5A200", // 수인분당선
  21: "#7CA8D5",  // 인천1호선
  22: "#ED8B00",  // 인천2호선
  107: "#5EB42E", // 에버라인
  110: "#FDA600", // 의정부경전철
  112: "#0054A6", // 경강선
  114: "#81A914", // 서해선
  115: "#A17800", // 김포골드라인
  117: "#6789CA", // 신림선
};

// ─── 노선 표시 레이블 (비호선 단축명) ────────────────────────────────────────
const LINE_LABELS: Record<number, string> = {
  91: "GTX-A",
  101: "공항",
  104: "경의중앙",
  108: "경춘",
  109: "신분당",
  113: "우이신설",
  116: "수인분당",
  21: "인천1",
  22: "인천2",
  107: "에버라인",
  110: "의정부",
  112: "경강",
  114: "서해",
  115: "김포골드",
  117: "신림",
};

export function getLineLabel(code: number | undefined): string {
  if (code === undefined) return "?";
  if (code >= 1 && code <= 9) return String(code);
  return LINE_LABELS[code] ?? `L${code}`;
}

export function getLineFullName(code: number | undefined, lineName?: string): string {
  if (code === undefined) return lineName ?? "?";
  if (code >= 1 && code <= 9) return `${code}호선`;
  return LINE_LABELS[code] ?? lineName ?? `L${code}`;
}

// ─── 노선별 배차 간격 (분) [peak, offpeak] ────────────────────────────────────
const LINE_HEADWAY: Record<number, [number, number]> = {
  1: [5, 8], 2: [3, 5], 3: [4, 6], 4: [4, 7],
  5: [5, 8], 6: [5, 8], 7: [5, 8], 8: [6, 10], 9: [5, 8],
  91: [20, 40], 101: [10, 15], 104: [8, 15], 108: [15, 30],
  109: [5, 8], 113: [5, 7], 116: [7, 15],
  21: [10, 15], 22: [10, 15],
};

function getHeadwayMin(lineCode: number): number {
  const h = new Date().getHours();
  const isPeak = (h >= 7 && h < 9) || (h >= 18 && h < 20);
  const [peak, offpeak] = LINE_HEADWAY[lineCode] ?? [8, 12];
  return Math.round((isPeak ? peak : offpeak) / 2);
}

// ─── ODsay subwayCode → Seoul API subwayId 매핑 ──────────────────────────────
const SUBWAY_ID_MAP: Record<number, string> = {
  1: "1001", 2: "1002", 3: "1003", 4: "1004", 5: "1005",
  6: "1006", 7: "1007", 8: "1008", 9: "1009",
  91: "1032",  // GTX-A
  101: "1065", // 공항철도
  104: "1063", // 경의중앙선
  108: "1067", // 경춘선
  109: "1077", // 신분당선
  113: "1092", // 우이신설선
  116: "1075", // 수인분당선
};

function getSubwayId(lineCode: number): string {
  return SUBWAY_ID_MAP[lineCode] ?? `1${String(lineCode).padStart(3, "0")}`;
}

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
  realtimeError?: string;
  realtimeIsTimetable?: boolean;
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
  departureWaitMinutes: number | null;
  departureArrivalMsg?: string;
  departureDirection?: string;
  departureError?: string;
  departureIsTimetable?: boolean;
}

export interface TransferPoint {
  stationName: string;
  lineCode: number;
  walkMinutes: number;
}

export type RealtimeArrivals = Record<string, {
  list: {
    subwayId: string;
    barvlDt: number;
    msg: string;
    bstatnNm: string;
    trainLineNm: string;
    updnLine: string;  // 상행/하행/내선/외선 — 방향 판별용
  }[];
  error?: string;
}>;

// ─── ODsay 내부 타입 ──────────────────────────────────────────────────────────

interface OdsayStation { stationID: number; stationName: string; x: number; y: number }

interface OdsaySubPath {
  trafficType: number;
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
  pathType: number;
  info: { totalTime: number; payment: number; firstStartStation: string; lastEndStation: string };
  subPath: OdsaySubPath[];
}

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────

const normStation = (s: string) => s.endsWith("역") ? s.slice(0, -1) : s;

function matchDirection(bstatnNm: string, way: string | undefined): boolean {
  if (!way) return true;
  const n = (s: string) => s.replace(/\s/g, "");
  return n(bstatnNm) === n(way) || n(bstatnNm).includes(n(way)) || n(way).includes(n(bstatnNm));
}

// 방향 + 급행 필터
// ① isExpress면 trainLineNm에 "급행"/"특급" 포함 열차만
//    반대로 일반이면 급행/특급 열차 제외 (해당 노선에 급행이 존재할 때만)
// ② way 종착역과 일치하는 열차 우선 (5호선 분기 등 엄격 구분)
// ③ 없으면 passStopList 경유역 종착 열차 (중간 종착 단거리)
// ④ 그래도 없으면 빈 배열 → 시간표
type ArrivalItem = RealtimeArrivals[string]["list"][number];

function isExpressLane(laneName?: string): boolean {
  return !!(laneName?.includes("급행") || laneName?.includes("특급"));
}

function getDirectionalTrains(
  lineTrains: ArrivalItem[],
  way: string | undefined,
  passStationNames: string[],
  express: boolean,
): ArrivalItem[] {
  // ① 급행/일반 분리
  const hasExpress = lineTrains.some(
    a => a.trainLineNm.includes("급행") || a.trainLineNm.includes("특급")
  );
  let pool: ArrivalItem[];
  if (express) {
    const ex = lineTrains.filter(a => a.trainLineNm.includes("급행") || a.trainLineNm.includes("특급"));
    pool = ex.length > 0 ? ex : lineTrains;
  } else if (hasExpress) {
    const reg = lineTrains.filter(a => !a.trainLineNm.includes("급행") && !a.trainLineNm.includes("특급"));
    pool = reg.length > 0 ? reg : lineTrains;
  } else {
    pool = lineTrains;
  }

  if (!way) return pool;

  // ② way 종착역 직접 매칭 (5호선 마천/상일동 등 분기 엄격 구분)
  const wayMatches = pool.filter(a => matchDirection(a.bstatnNm, way));
  if (wayMatches.length > 0) return wayMatches;

  // ③ passStopList 경유역 종착 (중간 종착 단거리 열차)
  if (passStationNames.length > 0) {
    const onPath = pool.filter(a => passStationNames.includes(normStation(a.bstatnNm)));
    if (onPath.length > 0) return onPath;
  }

  return [];
}

// 2호선 내선/외선 + 다음역 표시
function formatLine2Direction(trainLineNm: string, nextStationName?: string): string {
  const isOuter = trainLineNm.includes("외선");
  const isInner = trainLineNm.includes("내선");
  if (!isOuter && !isInner) return trainLineNm.split(" - ")[0] ?? trainLineNm;
  const dir = isOuter ? "외선" : "내선";
  return nextStationName ? `${dir}(다음역: ${nextStationName})` : dir;
}

// 1·9호선 급행/특급 포함 방향 표시
function formatExpressDirection(trainLineNm: string): string {
  const base = trainLineNm.split(" - ")[0] ?? trainLineNm;
  if (base.includes("급행") || base.includes("특급")) return base;
  if (trainLineNm.includes("급행")) return `급행 ${base}`;
  if (trainLineNm.includes("특급")) return `특급 ${base}`;
  return base;
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

export async function odsaySearchStation(name: string, apiKey: string): Promise<OdsayStation[]> {
  const q = normStation(name);
  const r = await odsayGet<{ station?: OdsayStation[] }>(
    "searchStation", { lang: "0", stationName: q, stationType: "1" }, apiKey
  );
  return (r.station ?? []).filter((s) => normStation(s.stationName) === q);
}

export async function odsaySearchRoutes(
  sx: number, sy: number, ex: number, ey: number,
  apiKey: string,
  fromName?: string,
  toName?: string,
): Promise<OdsayPath[]> {
  const r = await odsayGet<{ path?: OdsayPath[] }>(
    "searchPubTransPathT",
    { SX: String(sx), SY: String(sy), EX: String(ex), EY: String(ey), OPT: "0", SearchType: "0" },
    apiKey
  );
  let paths = (r.path ?? []).filter((p) => p.pathType === 1);

  if (fromName || toName) {
    const strict = paths.filter((p) => {
      const subs = p.subPath.filter((s) => s.trafficType === 1);
      if (subs.length === 0) return false;
      const first = subs[0].startStation?.stationName ?? subs[0].startName ?? "";
      const last = subs[subs.length - 1].endStation?.stationName ?? subs[subs.length - 1].endName ?? "";
      if (fromName && normStation(first) !== normStation(fromName)) return false;
      if (toName && normStation(last) !== normStation(toName)) return false;
      return true;
    });
    paths = strict.length > 0 ? strict : paths;
  }

  return paths.slice(0, 5);
}

// ─── 실시간 조회 대상 역 수집 ─────────────────────────────────────────────────

export function collectTransferPoints(paths: OdsayPath[]): TransferPoint[] {
  const seen = new Set<string>();
  const points: TransferPoint[] = [];
  for (const path of paths) {
    const subs = path.subPath;
    for (let i = 0; i < subs.length; i++) {
      if (subs[i].trafficType !== 3) continue;
      const hasPrev = subs.slice(0, i).some((s) => s.trafficType === 1);
      const nextSub = subs.slice(i + 1).find((s) => s.trafficType === 1);
      if (!hasPrev || !nextSub) continue;
      const name = nextSub.startStation?.stationName ?? nextSub.startName ?? "";
      const code = nextSub.lane?.[0]?.subwayCode ?? 0;
      const key = `${name}:${code}`;
      if (name && code && !seen.has(key)) {
        seen.add(key);
        points.push({ stationName: name, lineCode: code, walkMinutes: subs[i].sectionTime });
      }
    }
  }
  return points;
}

export function collectDepartureStations(paths: OdsayPath[]): string[] {
  const seen = new Set<string>();
  for (const path of paths) {
    const first = path.subPath.find((s) => s.trafficType === 1);
    const name = first?.startStation?.stationName ?? first?.startName ?? "";
    if (name) seen.add(name);
  }
  return Array.from(seen);
}

// ─── ODsay 경로 → ClientRoute 변환 ───────────────────────────────────────────

export function odsayPathsToClientRoutes(paths: OdsayPath[], arrivals: RealtimeArrivals): ClientRoute[] {
  const routes = paths.map((path) => {
    const segments: ClientSubPath[] = [];
    let isRealtimeEnhanced = false;

    const subPaths = path.subPath;
    const firstSubway = subPaths.find((s) => s.trafficType === 1);

    // ── 1. 출발역 대기시간 ────────────────────────────────────────────────────
    let departureWaitMinutes: number | null = null;
    let departureArrivalMsg: string | undefined;
    let departureDirection: string | undefined;
    let departureError: string | undefined;
    let departureIsTimetable = false;

    if (firstSubway) {
      const depName = firstSubway.startStation?.stationName ?? firstSubway.startName ?? "";
      const depCode = firstSubway.lane?.[0]?.subwayCode ?? 0;
      const depId = getSubwayId(depCode);
      const depWay = firstSubway.way;
      // passStopList 경유역 이름 (출발역 제외, 방향 판별 fallback용)
      const depPassNames = (firstSubway.passStopList?.stations ?? [])
        .slice(1).map(s => normStation(s.stationName));

      const depData = arrivals[depName];
      if (!depData) {
        departureError = "데이터 없음";
      } else if (depData.error) {
        departureError = depData.error;
      } else {
        const lineTrains = depData.list
          .filter(a => a.subwayId === depId && a.barvlDt >= 0)
          .sort((a, b) => a.barvlDt - b.barvlDt);
        const allLineTrains = depData.list.filter(a => a.subwayId === depId);

        if (lineTrains.length === 0) {
          departureError = allLineTrains.length > 0 ? "운행종료" : "데이터 없음";
        } else {
          const isExpressDep = isExpressLane(firstSubway.lane?.[0]?.name);
          const dirTrains = getDirectionalTrains(lineTrains, depWay, depPassNames, isExpressDep);
          const first = dirTrains[0];
          if (first) {
            departureWaitMinutes = Math.ceil(Math.max(0, first.barvlDt) / 60);
            departureArrivalMsg = first.msg;
            // 노선별 방향 표시 포맷
            const tnm = first.trainLineNm ?? "";
            if (depCode === 2) {
              const nextSt = firstSubway.passStopList?.stations[1]?.stationName;
              departureDirection = formatLine2Direction(tnm, nextSt);
            } else if (depCode === 1 || depCode === 9) {
              departureDirection = formatExpressDirection(tnm);
            } else {
              departureDirection = tnm.split(" - ")[0] ?? undefined;
            }
            isRealtimeEnhanced = true;
          } else {
            departureError = "해당 방향 대기 중";
          }
        }
      }

      if (departureWaitMinutes === null && departureError !== "운행종료") {
        departureWaitMinutes = getHeadwayMin(depCode);
        departureIsTimetable = true;
      }
    }

    let cumulativeMin = departureWaitMinutes ?? 0;

    // ── 2. 구간별 처리 ────────────────────────────────────────────────────────
    for (let i = 0; i < subPaths.length; i++) {
      const sp = subPaths[i];

      if (sp.trafficType === 1) {
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
          stations: sp.passStopList?.stations.map(s => ({
            index: s.index, name: s.stationName, id: String(s.stationID),
          })),
        });
        cumulativeMin += sp.sectionTime;

      } else if (sp.trafficType === 3) {
        const hasPrev = subPaths.slice(0, i).some(s => s.trafficType === 1);
        const nextSub = subPaths.slice(i + 1).find(s => s.trafficType === 1);
        if (!hasPrev || !nextSub) continue;

        const stationName = nextSub.startStation?.stationName ?? nextSub.startName ?? "";
        const lineCode = nextSub.lane?.[0]?.subwayCode ?? 0;
        const subwayId = getSubwayId(lineCode);
        const walkMin = sp.sectionTime;
        const arrivalAtTransferSec = (cumulativeMin + walkMin) * 60;
        const transferWay = nextSub.way;
        const transferPassNames = (nextSub.passStopList?.stations ?? [])
          .slice(1).map(s => normStation(s.stationName));

        let realtimeWaitMin: number | null = null;
        let realtimeMsg: string | undefined;
        let realtimeError: string | undefined;
        let realtimeIsTimetable = false;

        const stData = arrivals[stationName];
        if (!stData) {
          realtimeError = "데이터 없음";
        } else if (stData.error) {
          realtimeError = stData.error;
        } else {
          const lineTrains = stData.list
            .filter(a => a.subwayId === subwayId && a.barvlDt >= 0)
            .sort((a, b) => a.barvlDt - b.barvlDt);
          const allLineTrains = stData.list.filter(a => a.subwayId === subwayId);

          if (lineTrains.length === 0) {
            realtimeError = allLineTrains.length > 0 ? "운행종료" : "데이터 없음";
          } else {
            const isExpressTransfer = isExpressLane(nextSub.lane?.[0]?.name);
            const dirTrains = getDirectionalTrains(lineTrains, transferWay, transferPassNames, isExpressTransfer);
            const nextTrain = dirTrains
              .filter(a => a.barvlDt >= arrivalAtTransferSec)
              .sort((a, b) => a.barvlDt - b.barvlDt)[0];

            if (nextTrain) {
              realtimeWaitMin = Math.max(0, Math.ceil((nextTrain.barvlDt - arrivalAtTransferSec) / 60));
              realtimeMsg = nextTrain.msg;
              isRealtimeEnhanced = true;
            } else if (dirTrains.length > 0) {
              realtimeError = "범위 초과";
            } else {
              realtimeError = "해당 방향 대기 중";
            }
          }
        }

        if (realtimeWaitMin === null && realtimeError !== "운행종료") {
          realtimeWaitMin = getHeadwayMin(lineCode);
          realtimeIsTimetable = true;
        }

        cumulativeMin += walkMin + (realtimeWaitMin ?? 0);

        segments.push({
          trafficType: 3,
          sectionTime: walkMin,
          startName: segments.at(-1)?.endName ?? "",
          endName: stationName,
          realtimeWaitMinutes: realtimeWaitMin,
          realtimeArrivalMsg: realtimeMsg,
          realtimeError,
          realtimeIsTimetable,
        });
      }
    }

    const subwaySegs = subPaths.filter(s => s.trafficType === 1);
    const transferCount = Math.max(0, subwaySegs.length - 1);
    const stationCount = subwaySegs.reduce((sum, s) => sum + (s.stationCount ?? 0), 0);

    return {
      totalMinutes: path.info.totalTime,
      adjustedTotalMinutes: Math.round(cumulativeMin),
      transferCount,
      stationCount,
      cost: path.info.payment,
      segments,
      isRealtimeEnhanced,
      departureWaitMinutes,
      departureArrivalMsg,
      departureDirection,
      departureError,
      departureIsTimetable,
    } satisfies Omit<ClientRoute, "label">;
  });

  routes.sort((a, b) => a.adjustedTotalMinutes - b.adjustedTotalMinutes);
  const labeled = routes as ClientRoute[];
  if (labeled.length > 0) labeled[0].label = "최단시간";
  const minT = Math.min(...labeled.map(r => r.transferCount));
  const lt = labeled.find(r => r.transferCount === minT && !r.label);
  if (lt) lt.label = "최소환승";
  const minC = Math.min(...labeled.map(r => r.cost));
  const lc = labeled.find(r => r.cost === minC && !r.label);
  if (lc) lc.label = "최소비용";
  return labeled;
}
