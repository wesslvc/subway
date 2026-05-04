import { NextRequest, NextResponse } from "next/server";
import { searchStation, searchRoutes, OdsayPath, OdsaySubPath } from "@/lib/odsay-api";
import { getRealtimeArrivals, findMinWaitMinutes, RealtimeArrivalItem } from "@/lib/seoul-api";

export const runtime = "nodejs";

const ODSAY_KEY = process.env.ODSAY_API_KEY ?? "";
const REALTIME_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

// ─── Response types exported for client use ───────────────────────────────────

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

// ─── Line metadata ────────────────────────────────────────────────────────────

const LINE_COLORS: Record<number, string> = {
  1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A4E3",
  5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
  100: "#76C624", 104: "#77C4A3", 107: "#8CC63F", 108: "#0C8E72",
  109: "#FABE00", 110: "#D4003B", 112: "#B0CE18", 113: "#8BCBC8",
};

// ─── Real-time arrival fetch ──────────────────────────────────────────────────

async function fetchArrivals(names: string[]): Promise<Map<string, RealtimeArrivalItem[]>> {
  const map = new Map<string, RealtimeArrivalItem[]>();
  if (!REALTIME_KEY || names.length === 0) return map;
  await Promise.all(names.map(async (name) => {
    try {
      const arr = await getRealtimeArrivals(name, REALTIME_KEY);
      if (arr.length > 0) map.set(name, arr);
    } catch { /* non-fatal */ }
  }));
  return map;
}

// ─── Convert ODsay path to ClientRoute ───────────────────────────────────────

function toClientRoute(path: OdsayPath, arrivalMap: Map<string, RealtimeArrivalItem[]>): ClientRoute {
  const segments: ClientSubPath[] = [];
  let adjustedTotal = 0;
  let isRealtimeEnhanced = false;

  for (let i = 0; i < path.subPath.length; i++) {
    const sp = path.subPath[i];

    if (sp.trafficType === 1) {
      // Subway
      const lane = sp.lane?.[0];
      const code = lane?.subwayCode ?? 0;
      segments.push({
        trafficType: 1,
        sectionTime: sp.sectionTime,
        stationCount: sp.stationCount,
        startName: sp.startStation?.stationName ?? "",
        endName: sp.endStation?.stationName ?? "",
        lineName: lane?.name,
        lineCode: code,
        lineColor: LINE_COLORS[code] ?? "#888",
        direction: sp.way,
        stations: sp.passStopList?.stations.map((s) => ({
          index: s.index,
          name: s.stationName,
          id: String(s.stationID),
        })),
      });
      adjustedTotal += sp.sectionTime;

    } else if (sp.trafficType === 3) {
      // Walk / transfer
      const nextSubway = findNextSubway(path.subPath, i + 1);
      const boardingStation = nextSubway?.startStation?.stationName ?? "";
      const walkMin = sp.sectionTime;

      let realtimeWait: number | null = null;
      let realtimeMsg: string | undefined;

      if (nextSubway && boardingStation) {
        const lane = nextSubway.lane?.[0];
        const code = lane?.subwayCode ?? 0;
        if (code > 0) {
          const arrivals = arrivalMap.get(boardingStation) ?? [];
          if (arrivals.length > 0) {
            const wait = findMinWaitMinutes(arrivals, code);
            if (wait !== null) {
              realtimeWait = wait;
              const targetId = `1${String(code).padStart(3, "0")}`;
              realtimeMsg = arrivals.find((a) => a.subwayId === targetId)?.arvlMsg2;
              isRealtimeEnhanced = true;
            }
          }
        }
      }

      const prevEnd = segments.at(-1)?.endName ?? "";
      const nextStart = nextSubway?.startStation?.stationName ?? "";

      segments.push({
        trafficType: 3,
        sectionTime: walkMin,
        startName: prevEnd,
        endName: nextStart,
        realtimeWaitMinutes: realtimeWait,
        realtimeArrivalMsg: realtimeMsg,
      });

      const effectiveWait = realtimeWait ?? 3;
      adjustedTotal += walkMin + effectiveWait;
    }
  }

  return {
    totalMinutes: path.info.totalTime,
    adjustedTotalMinutes: Math.round(adjustedTotal),
    transferCount: path.info.transferCount,
    stationCount: path.info.totalStationCount,
    cost: path.info.payment,
    segments,
    isRealtimeEnhanced,
  };
}

function findNextSubway(subPaths: OdsaySubPath[], from: number): OdsaySubPath | undefined {
  return subPaths.slice(from).find((s) => s.trafficType === 1);
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? "";

  if (!from || !to) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: "", toName: "", searchTime: new Date().toISOString(), isRealtimeData: false, error: "출발지와 목적지를 입력하세요." },
      { status: 400 }
    );
  }

  if (!ODSAY_KEY) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: "서버 설정 오류: ODsay API 키가 없습니다." },
      { status: 500 }
    );
  }

  // Find station coordinates
  let fromStations, toStations;
  try {
    [fromStations, toStations] = await Promise.all([
      searchStation(from, ODSAY_KEY),
      searchStation(to, ODSAY_KEY),
    ]);
  } catch (e) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `역 검색 실패: ${String(e)}` },
      { status: 502 }
    );
  }

  const fromSt = fromStations[0];
  const toSt = toStations[0];

  if (!fromSt) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `'${from}' 역을 찾을 수 없습니다.` },
      { status: 404 }
    );
  }
  if (!toSt) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `'${to}' 역을 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  // Get routes
  let paths: OdsayPath[];
  try {
    paths = await searchRoutes(fromSt.x, fromSt.y, toSt.x, toSt.y, ODSAY_KEY);
  } catch (e) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `경로 검색 실패: ${String(e)}` },
      { status: 502 }
    );
  }

  if (paths.length === 0) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: "경로를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // Collect boarding stations for real-time lookup
  const boardingNames = new Set<string>();
  for (const path of paths) {
    for (let i = 0; i < path.subPath.length; i++) {
      const sp = path.subPath[i];
      if (sp.trafficType === 3) {
        const next = findNextSubway(path.subPath, i + 1);
        if (next?.startStation?.stationName) boardingNames.add(next.startStation.stationName);
      }
    }
  }

  const arrivalMap = await fetchArrivals(Array.from(boardingNames));

  // Build client routes
  const clientRoutes = paths.map((p) => toClientRoute(p, arrivalMap));
  clientRoutes.sort((a, b) => a.adjustedTotalMinutes - b.adjustedTotalMinutes);

  // Label
  if (clientRoutes.length > 0) clientRoutes[0].label = "최단시간";
  const minT = Math.min(...clientRoutes.map((r) => r.transferCount));
  const minTRoute = clientRoutes.find((r) => r.transferCount === minT && !r.label);
  if (minTRoute) minTRoute.label = "최소환승";
  const minC = Math.min(...clientRoutes.map((r) => r.cost));
  const minCRoute = clientRoutes.find((r) => r.cost === minC && !r.label);
  if (minCRoute) minCRoute.label = "최소비용";

  return NextResponse.json<FindRouteResponse>({
    routes: clientRoutes,
    fromName: fromSt.stationName,
    toName: toSt.stationName,
    searchTime: new Date().toISOString(),
    isRealtimeData: clientRoutes.some((r) => r.isRealtimeEnhanced),
  });
}
