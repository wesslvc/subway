import { NextRequest, NextResponse } from "next/server";
import {
  searchLocation,
  getSubwayRoutes,
  getRealtimeArrivals,
  findMinWaitMinutes,
  RouteItem,
  RealtimeArrivalItem,
} from "@/lib/seoul-api";

export const runtime = "nodejs";

const ROUTE_API_KEY = process.env.SEOUL_ROUTE_API_KEY ?? "";
const REALTIME_API_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

// ─── Response types exported for client use ───────────────────────────────────

export interface ClientSubPath {
  trafficType: number; // 1=subway, 3=walk/transfer
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

// ─── Line color map ───────────────────────────────────────────────────────────

const LINE_COLORS: Record<number, string> = {
  1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A4E3",
  5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
  101: "#76C624", // 공항철도
  104: "#77C4A3", // 경의중앙선
  109: "#FABE00", // 수인분당선
  110: "#D4003B", // 신분당선
};

const LINE_NAMES: Record<number, string> = {
  1: "1호선", 2: "2호선", 3: "3호선", 4: "4호선", 5: "5호선",
  6: "6호선", 7: "7호선", 8: "8호선", 9: "9호선",
  101: "공항철도", 104: "경의중앙선", 109: "수인분당선", 110: "신분당선",
};

// ─── Collect transfer station names across all routes ─────────────────────────

function collectTransferStations(routes: RouteItem[]): string[] {
  const names = new Set<string>();
  for (const route of routes) {
    for (const sp of route.subPathList) {
      if (sp.trafficType === 3 && sp.endName) names.add(sp.endName);
    }
  }
  return Array.from(names);
}

// ─── Fetch real-time arrivals for transfer stations ───────────────────────────

async function fetchTransferArrivals(
  stationNames: string[]
): Promise<Map<string, RealtimeArrivalItem[]>> {
  const map = new Map<string, RealtimeArrivalItem[]>();
  if (!REALTIME_API_KEY || stationNames.length === 0) return map;

  await Promise.all(
    stationNames.map(async (name) => {
      try {
        const arrivals = await getRealtimeArrivals(name, REALTIME_API_KEY);
        if (arrivals.length > 0) map.set(name, arrivals);
      } catch {
        // non-fatal
      }
    })
  );
  return map;
}

// ─── Convert RouteItem subPath to ClientSubPath ───────────────────────────────

function toClientSubPaths(
  route: RouteItem,
  arrivalMap: Map<string, RealtimeArrivalItem[]>
): { segments: ClientSubPath[]; adjustedTotal: number; isRealtimeEnhanced: boolean } {
  const segments: ClientSubPath[] = [];
  let adjustedTotal = 0;
  let isRealtimeEnhanced = false;

  for (const sp of route.subPathList) {
    if (sp.trafficType === 1) {
      // Subway segment
      const lane = sp.lane?.[0];
      const subwayCode = lane?.subwayCode ?? 0;
      const lineColor = LINE_COLORS[subwayCode] ?? "#888";
      const lineName = LINE_NAMES[subwayCode] ?? lane?.name ?? `${subwayCode}호선`;
      const stations = sp.passStopList?.stations?.map((s) => ({
        index: s.index,
        name: s.stationName,
        id: s.stationID,
      }));

      segments.push({
        trafficType: 1,
        sectionTime: sp.sectionTime,
        stationCount: sp.stationCount,
        startName: sp.startName,
        endName: sp.endName,
        lineName,
        lineCode: subwayCode,
        lineColor,
        direction: sp.way,
        stations,
      });
      adjustedTotal += sp.sectionTime;
    } else if (sp.trafficType === 3) {
      // Walk / transfer segment
      // Check real-time arrival at the destination (next subway boarding point)
      let realtimeWait: number | null = null;
      let realtimeMsg: string | undefined;

      // Find the next subway segment to know which line we're boarding
      const spIdx = route.subPathList.indexOf(sp);
      const nextSubway = route.subPathList.slice(spIdx + 1).find((s) => s.trafficType === 1);
      if (nextSubway) {
        const lane = nextSubway.lane?.[0];
        const subwayCode = lane?.subwayCode ?? 0;
        if (subwayCode > 0) {
          const arrivals = arrivalMap.get(sp.endName) ?? arrivalMap.get(nextSubway.startName) ?? [];
          if (arrivals.length > 0) {
            const wait = findMinWaitMinutes(arrivals, subwayCode);
            if (wait !== null) {
              realtimeWait = wait;
              const targetId = `1${String(subwayCode).padStart(3, "0")}`;
              const match = arrivals.find((a) => a.subwayId === targetId);
              realtimeMsg = match?.arvlMsg2;
              isRealtimeEnhanced = true;
            }
          }
        }
      }

      const walkMin = sp.sectionTime;
      const effectiveWait = realtimeWait ?? 3; // default 3 min wait if no realtime

      segments.push({
        trafficType: 3,
        sectionTime: walkMin,
        startName: sp.startName,
        endName: sp.endName,
        realtimeWaitMinutes: realtimeWait,
        realtimeArrivalMsg: realtimeMsg,
      });
      adjustedTotal += walkMin + effectiveWait;
    }
  }

  return { segments, adjustedTotal, isRealtimeEnhanced };
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

  if (!ROUTE_API_KEY) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: "서버 설정 오류: API 키가 없습니다." },
      { status: 500 }
    );
  }

  // Search coordinates for both stations
  let fromLocations, toLocations;
  try {
    [fromLocations, toLocations] = await Promise.all([
      searchLocation(from, ROUTE_API_KEY),
      searchLocation(to, ROUTE_API_KEY),
    ]);
  } catch (e) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `역 검색 실패: ${String(e)}` },
      { status: 502 }
    );
  }

  // Filter to subway stations (stationClass "2")
  const fromSubway = fromLocations.filter((l) => l.stationClass === "2" || !l.stationClass);
  const toSubway = toLocations.filter((l) => l.stationClass === "2" || !l.stationClass);

  const fromStation = fromSubway[0] ?? fromLocations[0];
  const toStation = toSubway[0] ?? toLocations[0];

  if (!fromStation) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `'${from}' 역을 찾을 수 없습니다.` },
      { status: 404 }
    );
  }
  if (!toStation) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `'${to}' 역을 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  // Get routes from Seoul transit API
  let rawRoutes: RouteItem[];
  try {
    rawRoutes = await getSubwayRoutes(
      parseFloat(fromStation.x),
      parseFloat(fromStation.y),
      parseFloat(toStation.x),
      parseFloat(toStation.y),
      5,
      ROUTE_API_KEY
    );
  } catch (e) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `경로 검색 실패: ${String(e)}` },
      { status: 502 }
    );
  }

  if (rawRoutes.length === 0) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: "경로를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // Collect transfer stations for real-time lookup
  const transferStations = collectTransferStations(rawRoutes);
  const arrivalMap = await fetchTransferArrivals(transferStations);

  // Convert to client routes
  const clientRoutes: ClientRoute[] = rawRoutes.map((r) => {
    const { segments, adjustedTotal, isRealtimeEnhanced } = toClientSubPaths(r, arrivalMap);
    return {
      totalMinutes: r.totalTime,
      adjustedTotalMinutes: Math.round(adjustedTotal),
      transferCount: r.totalTransitCount,
      stationCount: r.totalStationCount,
      cost: r.payment,
      segments,
      isRealtimeEnhanced,
    };
  });

  // Sort by adjusted time
  clientRoutes.sort((a, b) => a.adjustedTotalMinutes - b.adjustedTotalMinutes);

  // Label routes
  if (clientRoutes.length > 0) clientRoutes[0].label = "최단시간";
  const minTransfers = Math.min(...clientRoutes.map((r) => r.transferCount));
  const minTransferRoute = clientRoutes.find((r) => r.transferCount === minTransfers && !r.label);
  if (minTransferRoute) minTransferRoute.label = "최소환승";
  const minCost = Math.min(...clientRoutes.map((r) => r.cost));
  const minCostRoute = clientRoutes.find((r) => r.cost === minCost && !r.label);
  if (minCostRoute) minCostRoute.label = "최소비용";

  return NextResponse.json<FindRouteResponse>({
    routes: clientRoutes,
    fromName: fromStation.stationName || from,
    toName: toStation.stationName || to,
    searchTime: new Date().toISOString(),
    isRealtimeData: clientRoutes.some((r) => r.isRealtimeEnhanced),
  });
}

