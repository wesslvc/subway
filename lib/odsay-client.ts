"use client";

const ODSAY_BASE = "https://api.odsay.com/v1/api";

const LINE_COLORS: Record<number, string> = {
  1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A4E3",
  5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
  100: "#7CA8D5", 101: "#F5A200", 102: "#0C8E72", 103: "#77C4A3",
  104: "#76C624", 105: "#003DA5", 106: "#FABE00", 107: "#76C624",
  108: "#D4003B", 109: "#B0CE18", 110: "#8BCBC8", 111: "#AD8605", 112: "#FABE00",
};

// ─── 노선별 배차 간격 (분) [peak, offpeak] ────────────────────────────────────
// peak = 평일 7-9시, 18-20시 / offpeak = 그 외
const LINE_HEADWAY: Record<number, [number, number]> = {
  1: [5, 8], 2: [3, 5], 3: [4, 6], 4: [4, 7],
  5: [5, 8], 6: [5, 8], 7: [5, 8], 8: [6, 10], 9: [5, 8],
  // 경전철 등
  100: [8, 12], 101: [8, 12], 102: [8, 12], 103: [8, 12],
  104: [8, 12], 105: [8, 12], 106: [8, 12], 107: [8, 12],
  108: [8, 12], 109: [8, 12], 110: [8, 12], 111: [8, 12], 112: [8, 12],
};

function getHeadwayMin(lineCode: number): number {
  const now = new Date();
  const h = now.getHours();
  const isPeak = (h >= 7 && h < 9) || (h >= 18 && h < 20);
  const [peak, offpeak] = LINE_HEADWAY[lineCode] ?? [8, 12];
  return Math.round((isPeak ? peak : offpeak) / 2);
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
  realtimeError?: string;    // 실시간 오류 (표시용)
  realtimeIsTimetable?: boolean; // true = 시간표 기반 추정
}

export interface ClientRoute {
  totalMinutes: number;
  adjustedTotalMinutes: number; // 지금부터 도착까지 전체 분 (출발대기 + 이동 + 환승대기)
  transferCount: number;
  stationCount: number;
  cost: number;
  segments: ClientSubPath[];
  label?: string;
  isRealtimeEnhanced: boolean;
  departureWaitMinutes: number | null;  // 출발역 첫 열차 대기시간
  departureArrivalMsg?: string;         // 출발역 실시간 메시지
  departureDirection?: string;          // 행선지 "방화행", "외선순환" 등
  departureError?: string;             // 출발역 실시간 오류
  departureIsTimetable?: boolean;       // true = 시간표 기반 추정
}

export interface TransferPoint {
  stationName: string;
  lineCode: number;
  walkMinutes: number;
}

// barvlDt: 현재 기준 초, bstatnNm: 종착역명, trainLineNm: "방화행 - 신금호방면"
export type RealtimeArrivals = Record<string, {
  list: { subwayId: string; barvlDt: number; msg: string; bstatnNm: string; trainLineNm: string }[];
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
  way?: string; // 방향 종착역명 (예: "병점", "당고개")
}

interface OdsayPath {
  pathType: number;
  info: { totalTime: number; payment: number; firstStartStation: string; lastEndStation: string };
  subPath: OdsaySubPath[];
}

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────

// 역명 정규화: "역" 접미사 제거 (비교용)
const normStation = (s: string) => s.endsWith("역") ? s.slice(0, -1) : s;

// 방향 매칭: ODsay의 way 필드와 Seoul API의 bstatnNm 비교
function matchDirection(bstatnNm: string, way: string | undefined): boolean {
  if (!way) return true;
  const n = (s: string) => s.replace(/\s/g, "");
  return n(bstatnNm) === n(way) || n(bstatnNm).includes(n(way)) || n(way).includes(n(bstatnNm));
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

// 역명 검색 — "역" 접미사 포함/미포함 양쪽 허용
export async function odsaySearchStation(name: string, apiKey: string): Promise<OdsayStation[]> {
  const q = normStation(name);
  const r = await odsayGet<{ station?: OdsayStation[] }>(
    "searchStation", { lang: "0", stationName: q, stationType: "1" }, apiKey
  );
  return (r.station ?? []).filter((s) => normStation(s.stationName) === q);
}

// 지하철 전용 경로 탐색 — 역명 정규화(역 제거) 후 출발/도착역 검증
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
    // 엄격한 필터로 결과가 없으면 필터 없이 반환 (잠실·강남 같은 주요역 대응)
    paths = strict.length > 0 ? strict : paths;
  }

  return paths.slice(0, 5);
}

// ─── 실시간 조회 대상 역 수집 ─────────────────────────────────────────────────

// 환승역 수집 (환승 도보 앞뒤에 지하철이 있는 경우만)
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

// 출발역 수집 (각 경로의 첫 지하철 구간 출발역)
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

    // ── 1. 출발역 대기시간 계산 ───────────────────────────────────────────────
    let departureWaitMinutes: number | null = null;
    let departureArrivalMsg: string | undefined;
    let departureDirection: string | undefined;
    let departureError: string | undefined;

    let departureIsTimetable = false;

    if (firstSubway) {
      const depName = firstSubway.startStation?.stationName ?? firstSubway.startName ?? "";
      const depCode = firstSubway.lane?.[0]?.subwayCode ?? 0;
      const depId = `1${String(depCode).padStart(3, "0")}`;
      const depWay = firstSubway.way;

      const depData = arrivals[depName];
      if (!depData) {
        departureError = "데이터 없음";
      } else if (depData.error) {
        departureError = depData.error;
      } else {
        const lineTrains = depData.list
          .filter((a) => a.subwayId === depId && a.barvlDt >= 0)
          .sort((a, b) => a.barvlDt - b.barvlDt);

        if (lineTrains.length === 0) {
          // 노선 열차 자체가 없음 = 운행 종료
          departureError = "운행종료";
        } else {
          // 방향 일치 열차만 사용 (way 없으면 모든 방향 허용)
          const dirTrains = depWay
            ? lineTrains.filter((a) => matchDirection(a.bstatnNm, depWay))
            : lineTrains;

          const first = dirTrains[0];
          if (first) {
            departureWaitMinutes = Math.ceil(Math.max(0, first.barvlDt) / 60);
            departureArrivalMsg = first.msg;
            // "방화행 - 신금호방면" → "방화행"
            departureDirection = first.trainLineNm?.split(" - ")[0] ?? undefined;
            isRealtimeEnhanced = true;
          } else {
            // 반대 방향 열차만 있는 경우
            departureError = "반대방향 열차만 있음";
          }
        }
      }

      // 운행종료가 아닐 때만 시간표 기반 추정
      if (departureWaitMinutes === null && departureError !== "운행종료") {
        departureWaitMinutes = getHeadwayMin(depCode);
        departureIsTimetable = true;
      }
    }

    // 출발 대기시간부터 누적 시작 (없으면 0분)
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
          stations: sp.passStopList?.stations.map((s) => ({
            index: s.index, name: s.stationName, id: String(s.stationID),
          })),
        });
        cumulativeMin += sp.sectionTime;

      } else if (sp.trafficType === 3) {
        const hasPrev = subPaths.slice(0, i).some((s) => s.trafficType === 1);
        const nextSub = subPaths.slice(i + 1).find((s) => s.trafficType === 1);
        if (!hasPrev || !nextSub) continue;

        const stationName = nextSub.startStation?.stationName ?? nextSub.startName ?? "";
        const lineCode = nextSub.lane?.[0]?.subwayCode ?? 0;
        const subwayId = `1${String(lineCode).padStart(3, "0")}`;
        const walkMin = sp.sectionTime;
        const arrivalAtTransferSec = (cumulativeMin + walkMin) * 60;

        let realtimeWaitMin: number | null = null;
        let realtimeMsg: string | undefined;
        let realtimeError: string | undefined;

        let realtimeIsTimetable = false;

        const transferWay = nextSub.way;

        const stData = arrivals[stationName];
        if (!stData) {
          realtimeError = "데이터 없음";
        } else if (stData.error) {
          realtimeError = stData.error;
        } else {
          const lineTrains = stData.list
            .filter((a) => a.subwayId === subwayId && a.barvlDt >= 0)
            .sort((a, b) => a.barvlDt - b.barvlDt);

          if (lineTrains.length === 0) {
            realtimeError = "운행종료";
          } else {
            // 방향 일치 + 내가 도착한 이후 열차 중 가장 빠른 것
            const dirTrains = transferWay
              ? lineTrains.filter((a) => matchDirection(a.bstatnNm, transferWay))
              : lineTrains;

            const nextTrain = dirTrains
              .filter((a) => a.barvlDt >= arrivalAtTransferSec)
              .sort((a, b) => a.barvlDt - b.barvlDt)[0];

            if (nextTrain) {
              realtimeWaitMin = Math.max(0, Math.ceil((nextTrain.barvlDt - arrivalAtTransferSec) / 60));
              realtimeMsg = nextTrain.msg;
              isRealtimeEnhanced = true;
            } else if (dirTrains.length > 0) {
              // 방향 맞는 열차는 있지만 내 도착 시각 이후가 없음 → 범위 초과
              realtimeError = "범위 초과";
            } else if (transferWay) {
              // 반대 방향 열차만 있음
              realtimeError = "반대방향 열차만 있음";
            } else {
              realtimeError = "해당 노선 정보 없음";
            }
          }
        }

        // 운행종료가 아닐 때만 시간표 기반 추정
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

    const subwaySegs = subPaths.filter((s) => s.trafficType === 1);
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
  const minT = Math.min(...labeled.map((r) => r.transferCount));
  const lt = labeled.find((r) => r.transferCount === minT && !r.label);
  if (lt) lt.label = "최소환승";
  const minC = Math.min(...labeled.map((r) => r.cost));
  const lc = labeled.find((r) => r.cost === minC && !r.label);
  if (lc) lc.label = "최소비용";
  return labeled;
}
