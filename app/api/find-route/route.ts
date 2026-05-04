import { NextRequest, NextResponse } from "next/server";
import { STATIONS_BY_NAME } from "@/lib/subway-data";
import { findRoutes } from "@/lib/pathfinder";
import { getRealtimeArrivals, findMinWaitMinutes, RealtimeArrivalItem } from "@/lib/seoul-api";
import { RealtimeArrival } from "@/types/subway";

export const runtime = "nodejs";

const REALTIME_API_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

// ─── Response types exported for client use ───────────────────────────────────

export interface ClientSubPath {
  trafficType: number; // 1=subway, 3=walk/transfer
  sectionTime: number;
  stationCount?: number;
  startName: string;
  endName: string;
  lineName?: string;
  lineCode?: string;
  lineColor?: string;
  direction?: string;
  stations?: { index: number; name: string; id: string }[];
  realtimeWaitMinutes?: number | null;
  realtimeArrivalMsg?: string;
  walkSeconds?: number;
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

// ─── Fetch real-time arrivals for transfer stations ───────────────────────────

async function fetchTransferArrivals(
  transferStations: string[]
): Promise<Map<string, RealtimeArrivalItem[]>> {
  const map = new Map<string, RealtimeArrivalItem[]>();
  if (!REALTIME_API_KEY || transferStations.length === 0) return map;

  await Promise.all(
    transferStations.map(async (name) => {
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

// ─── Convert internal Route to ClientRoute ────────────────────────────────────

function toClientRoute(
  route: ReturnType<typeof findRoutes>[number],
  arrivalMap: Map<string, RealtimeArrivalItem[]>
): ClientRoute {
  let adjustedTotal = 0;
  let isRealtimeEnhanced = false;
  const segments: ClientSubPath[] = [];

  // line code → subwayId mapping for real-time API
  const lineCodeToSubwayId: Record<string, string> = {
    "1": "1001", "2": "1002", "3": "1003", "4": "1004",
    "5": "1005", "6": "1006", "7": "1007", "8": "1008", "9": "1009",
  };

  for (const seg of route.segments) {
    const segMinutes = Math.round(
      (seg.stops.reduce((_, __, i) => {
        if (i === 0) return 0;
        return 0;
      }, 0))
    );

    // Calculate actual segment travel time from adjacent edges
    const allStops = [seg.fromStation, ...seg.stops, seg.toStation];
    let travelTime = 0;
    for (let i = 0; i < allStops.length - 1; i++) {
      const from = allStops[i];
      const adj = from.adjacent.find((a) => a.stationId === allStops[i + 1].id);
      if (adj) travelTime += adj.time;
    }

    // Check real-time wait at transfer point
    let realtimeWait: number | null = null;
    let realtimeMsg: string | undefined;

    if (seg.waitMinutes !== undefined) {
      // This is a transfer segment - check real-time
      const arrivals = arrivalMap.get(seg.fromStation.name) ?? [];
      if (arrivals.length > 0) {
        const subwayId = lineCodeToSubwayId[seg.line];
        if (subwayId) {
          const matching = arrivals.filter((a) => a.subwayId === subwayId);
          if (matching.length > 0) {
            const secs = matching
              .map((a) => parseInt(a.barvlDt, 10))
              .filter((s) => !isNaN(s) && s >= 0)
              .sort((a, b) => a - b);
            if (secs.length > 0) {
              realtimeWait = Math.ceil(secs[0] / 60);
              realtimeMsg = matching[0].arvlMsg2;
              isRealtimeEnhanced = true;
            }
          }
        }
      }
    }

    const walkSec = seg.walkSeconds;
    const walkMin = walkSec ? Math.ceil(walkSec / 60) : 0;
    const effectiveWait = realtimeWait ?? seg.waitMinutes ?? 0;

    // Add walk segment before subway segment if this is a transfer
    if (walkMin > 0 || effectiveWait > 0) {
      segments.push({
        trafficType: 3,
        sectionTime: walkMin,
        startName: seg.fromStation.name,
        endName: seg.fromStation.name,
        realtimeWaitMinutes: realtimeWait ?? seg.waitMinutes ?? null,
        realtimeArrivalMsg: realtimeMsg,
        walkSeconds: walkSec,
      });
      adjustedTotal += walkMin + effectiveWait;
    }

    // Subway segment
    segments.push({
      trafficType: 1,
      sectionTime: travelTime,
      stationCount: allStops.length - 1,
      startName: seg.fromStation.name,
      endName: seg.toStation.name,
      lineName: `${seg.line}호선`,
      lineCode: seg.line,
      lineColor: seg.lineColor,
      direction: seg.direction,
      stations: allStops.map((s, i) => ({ index: i, name: s.name, id: s.id })),
    });
    adjustedTotal += travelTime;
  }

  return {
    totalMinutes: route.totalMinutes,
    adjustedTotalMinutes: Math.round(adjustedTotal),
    transferCount: route.transferCount,
    stationCount: route.stationCount,
    cost: route.cost,
    segments,
    label: route.label,
    isRealtimeEnhanced,
  };
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

  // Look up stations in local graph
  const fromStations = STATIONS_BY_NAME.get(from) ?? [];
  const toStations = STATIONS_BY_NAME.get(to) ?? [];

  if (fromStations.length === 0) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `'${from}' 역을 찾을 수 없습니다. 정확한 역명을 입력해주세요.` },
      { status: 404 }
    );
  }
  if (toStations.length === 0) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: `'${to}' 역을 찾을 수 없습니다. 정확한 역명을 입력해주세요.` },
      { status: 404 }
    );
  }

  // Find routes using local pathfinder
  const routes = findRoutes({ from, to });

  if (routes.length === 0) {
    return NextResponse.json<FindRouteResponse>(
      { routes: [], fromName: from, toName: to, searchTime: new Date().toISOString(), isRealtimeData: false, error: "경로를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // Collect transfer station names for real-time lookup
  const transferNames = new Set<string>();
  for (const route of routes) {
    for (const seg of route.segments) {
      if (seg.walkSeconds !== undefined && seg.walkSeconds > 0) {
        transferNames.add(seg.fromStation.name);
      }
    }
  }

  // Fetch real-time arrivals in parallel
  const arrivalMap = await fetchTransferArrivals(Array.from(transferNames));

  // Convert to client routes
  const clientRoutes = routes.map((r) => toClientRoute(r, arrivalMap));

  // Re-sort by adjusted time after real-time enhancement
  clientRoutes.sort((a, b) => a.adjustedTotalMinutes - b.adjustedTotalMinutes);

  // Re-label after sort
  clientRoutes.forEach((r) => { r.label = undefined; });
  if (clientRoutes.length > 0) clientRoutes[0].label = "최단시간";
  const minTransfers = Math.min(...clientRoutes.map((r) => r.transferCount));
  const minTransferRoute = clientRoutes.find((r) => r.transferCount === minTransfers && !r.label);
  if (minTransferRoute) minTransferRoute.label = "최소환승";
  const minCost = Math.min(...clientRoutes.map((r) => r.cost));
  const minCostRoute = clientRoutes.find((r) => r.cost === minCost && !r.label);
  if (minCostRoute) minCostRoute.label = "최소비용";

  return NextResponse.json<FindRouteResponse>({
    routes: clientRoutes,
    fromName: from,
    toName: to,
    searchTime: new Date().toISOString(),
    isRealtimeData: clientRoutes.some((r) => r.isRealtimeEnhanced),
  });
}
