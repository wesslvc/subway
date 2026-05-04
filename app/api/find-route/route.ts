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
  trafficType: number; // 1=subway, 2=bus, 3=walk
  sectionTime: number; // minutes
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLineColor(code: number): string {
  const map: Record<number, string> = {
    1: "#0052A4",
    2: "#00A84D",
    3: "#EF7C1C",
    4: "#00A5DE",
    5: "#996CAC",
    6: "#CD7C2F",
    7: "#747F00",
    8: "#E6186C",
    9: "#BDB092",
    101: "#FC4C02",
    104: "#6789CA",
    109: "#77C4A3",
    110: "#F5A200",
  };
  return map[code] ?? "#888888";
}

async function enhanceWithRealtime(
  route: RouteItem
): Promise<{ segments: ClientSubPath[]; adjustedTotal: number; isRealtime: boolean }> {
  let adjustedTotal = 0;
  let isRealtime = false;
  const segments: ClientSubPath[] = [];

  // Collect unique transfer station names (trafficType=3 walk segments)
  const transferSet = new Set<string>();
  route.subPathList.forEach((sp) => {
    if (sp.trafficType === 3 && sp.startName) transferSet.add(sp.startName);
  });
  const uniqueTransfers = Array.from(transferSet);

  // Fetch real-time arrivals for all transfer stations in parallel
  const arrivalMap = new Map<string, RealtimeArrivalItem[]>();
  if (REALTIME_API_KEY && uniqueTransfers.length > 0) {
    await Promise.all(
      uniqueTransfers.map(async (name) => {
        try {
          const arrivals = await getRealtimeArrivals(name, REALTIME_API_KEY);
          arrivalMap.set(name, arrivals);
        } catch {
          // Non-fatal
        }
      })
    );
  }

  for (let i = 0; i < route.subPathList.length; i++) {
    const sp = route.subPathList[i];
    const seg: ClientSubPath = {
      trafficType: sp.trafficType,
      sectionTime: sp.sectionTime,
      startName: sp.startName,
      endName: sp.endName,
    };

    if (sp.trafficType === 1 && sp.lane && sp.lane.length > 0) {
      const lane = sp.lane[0];
      seg.lineName = lane.name;
      seg.lineCode = lane.subwayCode;
      seg.lineColor = getLineColor(lane.subwayCode);
      seg.direction = sp.way ?? lane.endName;
      if (sp.passStopList?.stations) {
        seg.stations = sp.passStopList.stations.map((s) => ({
          index: s.index,
          name: s.stationName,
          id: s.stationID,
        }));
      }
      if (sp.stationCount !== undefined) seg.stationCount = sp.stationCount;
      adjustedTotal += sp.sectionTime;
    } else if (sp.trafficType === 3) {
      // Walk/transfer — find next subway segment to determine which line to wait for
      const nextSub = route.subPathList.slice(i + 1).find((x) => x.trafficType === 1);
      let realtimeWait: number | null = null;
      let arrivalMsg: string | undefined;

      if (nextSub && nextSub.lane && nextSub.lane.length > 0) {
        const arrivals = arrivalMap.get(sp.startName) ?? [];
        if (arrivals.length > 0) {
          realtimeWait = findMinWaitMinutes(arrivals, nextSub.lane[0].subwayCode);
          if (realtimeWait !== null) {
            isRealtime = true;
            // Get the friendly arrival message
            const subwayCode = nextSub.lane[0].subwayCode;
            const lineCodeMap: Record<number, string> = {
              1: "1001", 2: "1002", 3: "1003", 4: "1004", 5: "1005",
              6: "1006", 7: "1007", 8: "1008", 9: "1009",
              101: "1065", 104: "1077", 109: "1075", 110: "1067",
            };
            const targetId = lineCodeMap[subwayCode];
            const matching = arrivals.find((a) => a.subwayId === targetId);
            arrivalMsg = matching?.arvlMsg2;
          }
        }
      }

      seg.realtimeWaitMinutes = realtimeWait;
      if (arrivalMsg) seg.realtimeArrivalMsg = arrivalMsg;
      // Walk time + actual wait time (or 0 if no real-time data)
      adjustedTotal += sp.sectionTime + (realtimeWait ?? 0);
    } else {
      adjustedTotal += sp.sectionTime;
    }

    segments.push(seg);
  }

  return { segments, adjustedTotal, isRealtime };
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();

  if (!from || !to) {
    return NextResponse.json<FindRouteResponse>(
      {
        routes: [],
        fromName: "",
        toName: "",
        searchTime: new Date().toISOString(),
        isRealtimeData: false,
        error: "출발지와 목적지를 입력하세요.",
      },
      { status: 400 }
    );
  }

  if (!ROUTE_API_KEY) {
    return NextResponse.json<FindRouteResponse>(
      {
        routes: [],
        fromName: "",
        toName: "",
        searchTime: new Date().toISOString(),
        isRealtimeData: false,
        error: "서버 설정 오류: SEOUL_ROUTE_API_KEY가 없습니다.",
      },
      { status: 500 }
    );
  }

  try {
    // 1. Resolve coordinates
    const [fromLocations, toLocations] = await Promise.all([
      searchLocation(from, ROUTE_API_KEY),
      searchLocation(to, ROUTE_API_KEY),
    ]);

    if (fromLocations.length === 0) {
      return NextResponse.json<FindRouteResponse>(
        {
          routes: [],
          fromName: from,
          toName: to,
          searchTime: new Date().toISOString(),
          isRealtimeData: false,
          error: `'${from}' 위치를 찾을 수 없습니다.`,
        },
        { status: 404 }
      );
    }
    if (toLocations.length === 0) {
      return NextResponse.json<FindRouteResponse>(
        {
          routes: [],
          fromName: from,
          toName: to,
          searchTime: new Date().toISOString(),
          isRealtimeData: false,
          error: `'${to}' 위치를 찾을 수 없습니다.`,
        },
        { status: 404 }
      );
    }

    const fromLoc = fromLocations[0];
    const toLoc = toLocations[0];

    // 2. Get route options from Seoul API
    const rawRoutes = await getSubwayRoutes(
      parseFloat(fromLoc.x),
      parseFloat(fromLoc.y),
      parseFloat(toLoc.x),
      parseFloat(toLoc.y),
      5,
      ROUTE_API_KEY
    );

    if (rawRoutes.length === 0) {
      return NextResponse.json<FindRouteResponse>(
        {
          routes: [],
          fromName: fromLoc.stationName,
          toName: toLoc.stationName,
          searchTime: new Date().toISOString(),
          isRealtimeData: false,
          error: "경로를 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    // 3. Enhance each route with real-time arrival data
    const enhancedRoutes = await Promise.all(
      rawRoutes.map(async (route) => {
        const { segments, adjustedTotal, isRealtime } = await enhanceWithRealtime(route);
        const clientRoute: ClientRoute = {
          totalMinutes: route.totalTime,
          adjustedTotalMinutes: adjustedTotal,
          transferCount: route.totalTransitCount,
          stationCount: route.totalStationCount,
          cost: route.payment,
          segments,
          isRealtimeEnhanced: isRealtime,
        };
        return clientRoute;
      })
    );

    // 4. Sort and label
    enhancedRoutes.sort((a, b) => a.adjustedTotalMinutes - b.adjustedTotalMinutes);

    if (enhancedRoutes.length > 0) enhancedRoutes[0].label = "최단시간";

    const minTransfers = Math.min(...enhancedRoutes.map((r) => r.transferCount));
    const minTransferRoute = enhancedRoutes.find(
      (r) => r.transferCount === minTransfers && !r.label
    );
    if (minTransferRoute) minTransferRoute.label = "최소환승";

    const minCost = Math.min(...enhancedRoutes.map((r) => r.cost));
    const minCostRoute = enhancedRoutes.find((r) => r.cost === minCost && !r.label);
    if (minCostRoute) minCostRoute.label = "최소비용";

    return NextResponse.json<FindRouteResponse>({
      routes: enhancedRoutes,
      fromName: fromLoc.stationName,
      toName: toLoc.stationName,
      searchTime: new Date().toISOString(),
      isRealtimeData: enhancedRoutes.some((r) => r.isRealtimeEnhanced),
    });
  } catch (err) {
    console.error("[find-route]", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json<FindRouteResponse>(
      {
        routes: [],
        fromName: from,
        toName: to,
        searchTime: new Date().toISOString(),
        isRealtimeData: false,
        error: `경로 검색 중 오류: ${message}`,
      },
      { status: 500 }
    );
  }
}
