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

function getFullHeadwayMin(lineCode: number): number {
  const h = new Date().getHours();
  const isPeak = (h >= 7 && h < 9) || (h >= 18 && h < 20);
  const [peak, offpeak] = LINE_HEADWAY[lineCode] ?? [8, 12];
  return isPeak ? peak : offpeak;
}

function getHeadwayMin(lineCode: number): number {
  return Math.round(getFullHeadwayMin(lineCode) / 2);
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
  realtimeDirection?: string;  // 환승 후 탑승 열차 방향 표시
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
    arvlCd: string;    // 0=진입,1=도착,2=출발,...
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

// 비교용 정규화: 괄호 부속명 제거, 공백/역 제거
function normForMatch(s: string): string {
  return s.replace(/\(.*?\)/g, "").replace(/\s/g, "").replace(/역$/, "");
}

function matchDirection(bstatnNm: string, way: string | undefined): boolean {
  if (!way) return true;
  const a = normForMatch(bstatnNm);
  const b = normForMatch(way);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// 방향 + 급행 필터
// ① 급행/일반 분리 (express=true면 급행/특급, false면 일반)
// ② trainLineNm의 "○○방면" 힌트 부분에 사용자 경로상 후속역 중 하나가 포함되면 매칭
// ③ way 매칭은 "라인 종점으로 보이는 way"에 한해서만 fallback (환승역 = 구간끝일 때 잘못 매칭 방지)
// ④ arvlCd=1(도착)/2(출발) 열차는 boardable에서 제외 (지금탑승 범위는 접근까지)
type ArrivalItem = RealtimeArrivals[string]["list"][number];

function isExpressLane(laneName?: string): boolean {
  return !!(laneName?.includes("급행") || laneName?.includes("특급"));
}

// arvlCd: 1=도착(승강장 도달), 2=출발(이미 떠남) → 탑승 불가로 간주
function isBoardable(a: ArrivalItem): boolean {
  return a.arvlCd !== "1" && a.arvlCd !== "2";
}

// barvlDt=0은 진입(arvlCd=0) 상태일 때만 신뢰
// 전역출발(3)/전역진입(4)/운행중(99) 등에서 barvlDt=0은 API가 ETA 미계산 → "곧 출발" 오표시 방지
function hasReliableEta(a: ArrivalItem): boolean {
  return a.barvlDt > 0 || a.arvlCd === "0";
}

function getDirectionalTrains(
  lineTrains: ArrivalItem[],
  passStationNames: string[],  // ODsay passStopList[1:] 후속역 배열
  way: string | undefined,     // ODsay way — 해당 방향 종착역 (분기 노선 구분 기준)
  express: boolean,
  endStationName?: string,     // 이 구간의 실제 하차역 — 중간기착행 제외용
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

  const passNorm = passStationNames.map(normForMatch).filter(Boolean);
  const wayNorm = way ? normForMatch(way) : "";
  const endNorm = endStationName ? normForMatch(endStationName) : (passNorm.at(-1) ?? "");

  // ② bstatnNm 기반 매칭 — 분기 노선 엄격 구분 + 중간기착행 제외 (최우선)
  //    validSet = {구간 목표역, way 종착역} 만 허용
  //    중간역(목표역 이전)을 종착으로 하는 열차는 제외
  //
  //    예) 강동→오금(마천 branch): validSet = {오금, 마천}
  //        마천行 bstatnNm="마천" → 포함 ✓
  //        하남검단산行 bstatnNm="하남검단산" → 제외 ✓
  //        오금行(단거리 회차) bstatnNm="오금" → 포함 ✓
  //        둔촌동行(중간기착) bstatnNm="둔촌동" → 제외 ✓ (기존엔 포함됐던 버그)
  const validSet = new Set([endNorm, wayNorm].filter(Boolean));
  if (validSet.size > 0) {
    const bstatnMatch = pool.filter(a => {
      const b = normForMatch(a.bstatnNm);
      return [...validSet].some(v => b === v || b.includes(v) || v.includes(b));
    });
    if (bstatnMatch.length > 0) return bstatnMatch;
  }

  // ③ trainLineNm "방면" 힌트 매칭 (bstatnNm 매칭 실패 시 보조)
  //    way=종착역이 아닌 segment 끝역일 때, 경유 힌트로 through-train 포착
  //    "마천행 - 둔촌동방면" + passNorm에 "둔촌동" → 매칭 ✓
  //    "하남검단산행 - 길동방면" + passNorm(마천 branch)에 "길동" 없음 → 제외 ✓
  if (passNorm.length > 0) {
    const hintMatch = pool.filter(a => {
      const tnm = (a.trainLineNm ?? "").replace(/\s/g, "");
      const dashIdx = tnm.indexOf("-");
      if (dashIdx < 0) return false;
      const hintPart = normForMatch(tnm.slice(dashIdx + 1));
      return passNorm.some(n => hintPart.includes(n));
    });
    if (hintMatch.length > 0) return hintMatch;
  }

  // ④ 방향 정보 없음 → pool 전체 (단방향 종점역 등 예외용 마지막 보험)
  //    way도 passStopList도 없으면 방향 판별 불가 → 어쩔 수 없이 전체 반환
  //    way나 passStopList가 있었는데 여기 도달하면 해당 방향 열차 없음 → 빈 배열
  if (!wayNorm && passNorm.length === 0) return pool;
  return [];
}

// 1·9호선 특급/급행/일반 표시
function formatExpressDirection(trainLineNm: string): string {
  const base = (trainLineNm.split(" - ")[0] ?? trainLineNm).trim();
  if (/^(특급|급행)\s/.test(base)) return base;
  if (trainLineNm.includes("특급")) return `특급 ${base}`;
  if (trainLineNm.includes("급행")) return `급행 ${base}`;
  return `일반 ${base}`;
}

// 노선별 방향 표시 디스패처
// updnLine: Seoul API의 "내선"/"외선"/"상행"/"하행" 값 — 2호선 방향 판별에 사용
function formatDirectionByLine(
  lineCode: number,
  trainLineNm: string,
  updnLine: string,
  nextStationName?: string,
): string {
  const next = nextStationName ? normStation(nextStationName) : "";

  // 2호선: updnLine 또는 trainLineNm에서 내선/외선 감지
  if (lineCode === 2) {
    const isOuter = updnLine.includes("외선") || trainLineNm.includes("외선");
    const isInner = updnLine.includes("내선") || trainLineNm.includes("내선");
    if (isOuter) return next ? `외선순환(다음역: ${next})` : "외선순환";
    if (isInner) return next ? `내선순환(다음역: ${next})` : "내선순환";
    // 성수지선 등 내/외선 명시 없을 때: terminus + 다음역
    const terminus = trainLineNm.split(" - ")[0]?.trim() ?? trainLineNm;
    return next ? `${terminus}(다음역: ${next})` : terminus;
  }

  if (lineCode === 1 || lineCode === 9) return formatExpressDirection(trainLineNm);
  return (trainLineNm.split(" - ")[0] ?? trainLineNm).trim();
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

// 경로를 먼저 확정한 뒤 탑승 지점 전체를 수집해 실시간 데이터를 일괄 요청
// (출발역 + 모든 환승역 = 모든 지하철 구간 시작역)
export function collectAllBoardingStations(paths: OdsayPath[]): string[] {
  const seen = new Set<string>();
  for (const path of paths) {
    for (const sub of path.subPath) {
      if (sub.trafficType !== 1) continue;
      const name = sub.startStation?.stationName ?? sub.startName ?? "";
      if (name) seen.add(name);
    }
  }
  return Array.from(seen);
}

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
      const depEndName = firstSubway.endStation?.stationName ?? firstSubway.endName ?? "";
      // 출발역 이후 후속역들 (방향 판별 힌트용)
      const depPassNames = (firstSubway.passStopList?.stations ?? [])
        .slice(1).map(s => s.stationName);

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
          const dirTrains = getDirectionalTrains(lineTrains, depPassNames, depWay, isExpressDep, depEndName);
          // 탑승 가능 + ETA 신뢰 가능 열차 우선 선택
          // barvlDt=0 이면서 진입(arvlCd=0) 아닌 열차는 ETA 불명확 → 건너뜀
          const boardable = dirTrains.filter(isBoardable);
          const first = boardable.find(hasReliableEta);
          if (first) {
            departureWaitMinutes = Math.ceil(first.barvlDt / 60);
            departureArrivalMsg = first.msg;
            const nextSt = firstSubway.passStopList?.stations[1]?.stationName;
            departureDirection = formatDirectionByLine(depCode, first.trainLineNm ?? "", first.updnLine ?? "", nextSt);
            isRealtimeEnhanced = true;
          } else if (boardable.length > 0) {
            // 열차는 있으나 ETA 불명확(barvlDt=0) → 시간표 fallback
            departureError = "ETA 미계산";
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
    // 직전 실시간 매칭에서 얻은 방향 — 다음 subway segment에 전달
    let pendingRealtimeDirection: string | undefined = departureDirection;

    // ── 2. 구간별 처리 ────────────────────────────────────────────────────────
    for (let i = 0; i < subPaths.length; i++) {
      const sp = subPaths[i];

      if (sp.trafficType === 1) {
        const lane = sp.lane?.[0];
        const code = lane?.subwayCode ?? 0;
        const segRtDir = pendingRealtimeDirection;
        pendingRealtimeDirection = undefined;  // 소비
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
          realtimeDirection: segRtDir,  // 실시간 매칭 방향 (RouteDetail에서 사용)
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
        const transferEndName = nextSub.endStation?.stationName ?? nextSub.endName ?? "";
        const transferPassNames = (nextSub.passStopList?.stations ?? [])
          .slice(1).map(s => s.stationName);
        const transferNextStation = nextSub.passStopList?.stations[1]?.stationName;

        let realtimeWaitMin: number | null = null;
        let realtimeMsg: string | undefined;
        let realtimeError: string | undefined;
        let realtimeIsTimetable = false;
        let realtimeDirection: string | undefined;

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
            const dirTrains = getDirectionalTrains(lineTrains, transferPassNames, transferWay, isExpressTransfer, transferEndName);

            if (dirTrains.length === 0) {
              realtimeError = "해당 방향 대기 중";
            } else {
              const sorted = [...dirTrains].sort((a, b) => a.barvlDt - b.barvlDt);
              // 사용자가 환승역 도달 후에 탑승 가능한 첫 열차 (도착/출발 상태 제외)
              const nextTrain = sorted.find(a => a.barvlDt >= arrivalAtTransferSec && isBoardable(a));

              if (nextTrain) {
                realtimeWaitMin = Math.max(0, Math.ceil((nextTrain.barvlDt - arrivalAtTransferSec) / 60));
                realtimeMsg = nextTrain.msg;
                realtimeDirection = formatDirectionByLine(lineCode, nextTrain.trainLineNm ?? "", nextTrain.updnLine ?? "", transferNextStation);
                isRealtimeEnhanced = true;
              } else {
                // 도착 시점이 실시간 데이터 범위를 넘음 → 마지막 관측 열차 + 배차간격으로 외삽
                const last = sorted[sorted.length - 1];
                const headwaySec = getFullHeadwayMin(lineCode) * 60;
                let projected = last.barvlDt + headwaySec;
                while (projected < arrivalAtTransferSec) projected += headwaySec;
                realtimeWaitMin = Math.max(0, Math.ceil((projected - arrivalAtTransferSec) / 60));
                realtimeMsg = `최근 관측 ${Math.round(last.barvlDt / 60)}분 후 + 배차 외삽`;
                realtimeDirection = formatDirectionByLine(lineCode, last.trainLineNm ?? "", last.updnLine ?? "", transferNextStation);
                realtimeIsTimetable = true;
                isRealtimeEnhanced = true;
              }
            }
          }
        }

        if (realtimeWaitMin === null && realtimeError !== "운행종료") {
          realtimeWaitMin = getHeadwayMin(lineCode);
          realtimeIsTimetable = true;
        }

        cumulativeMin += walkMin + (realtimeWaitMin ?? 0);

        // 다음 subway segment에 방향 전달
        pendingRealtimeDirection = realtimeDirection;

        segments.push({
          trafficType: 3,
          sectionTime: walkMin,
          startName: segments.at(-1)?.endName ?? "",
          endName: stationName,
          realtimeWaitMinutes: realtimeWaitMin,
          realtimeArrivalMsg: realtimeMsg,
          realtimeError,
          realtimeIsTimetable,
          realtimeDirection,
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
