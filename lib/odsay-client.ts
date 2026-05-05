"use client";

import { RealtimeArrival } from "@/types/subway";
import { getLineName, getSubwayId, getLineColor } from "./utils";
import { searchStation, searchRoutes } from "./odsay-api";

const ODSAY_API_KEY = process.env.NEXT_PUBLIC_ODSAY_API_KEY || "";

export type { RealtimeArrival };
export type RealtimeArrivals = RealtimeArrival[];

export interface ClientRouteSegment {
  trafficType: number;
  line?: string;
  lineName?: string;
  color?: string;
  startName: string;
  endName: string;
  sectionTime: number;
  stationCount?: number;
  wayName?: string;
  realtimeWaitMinutes?: number;
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
  segments: ClientRouteSegment[];
  isRealtimeEnhanced: boolean;
  departureWaitMinutes?: number;
  departureArrivalMsg?: string;
  departureDirection?: string;
  departureError?: string;
  departureIsTimetable?: boolean;
  label?: string;
}

// ─── API 래퍼 함수 ───
export async function odsaySearchStation(name: string, apiKey?: string) {
  return searchStation(name, apiKey || ODSAY_API_KEY);
}

export async function odsaySearchRoutes(
  sx: number, 
  sy: number, 
  ex: number, 
  ey: number, 
  apiKey?: string,
  startName?: string,
  endName?: string
) {
  return searchRoutes(sx, sy, ex, ey, apiKey || ODSAY_API_KEY);
}

// ─── 헬퍼 함수: page.tsx에서 전달하는 OdsayPath 원본 배열도 처리할 수 있도록 any[] 적용 및 호환 로직 추가 ───
export function collectTransferPoints(routes: any[]): string[] {
  const points = new Set<string>();
  routes.forEach((route) => {
    // 1. 원본 API 데이터 (OdsayPath) 구조인 경우
    if (route.subPath) {
      route.subPath.forEach((seg: any, idx: number) => {
        if (idx > 0 && seg.trafficType === 1 && seg.startStation?.stationName) {
          points.add(seg.startStation.stationName);
        }
      });
    } 
    // 2. 가공된 데이터 (ClientRoute) 구조인 경우
    else if (route.segments) {
      route.segments.forEach((seg: any, idx: number) => {
        if (idx > 0 && seg.trafficType === 1 && seg.startName) {
          points.add(seg.startName);
        }
      });
    }
  });
  return Array.from(points);
}

export function collectDepartureStations(routes: any[]): string[] {
  const stations = new Set<string>();
  routes.forEach((route) => {
    // 1. 원본 API 데이터 (OdsayPath) 구조인 경우
    if (route.subPath) {
      const firstSubway = route.subPath.find((s: any) => s.trafficType === 1);
      if (firstSubway && firstSubway.startStation?.stationName) {
        stations.add(firstSubway.startStation.stationName);
      }
    } 
    // 2. 가공된 데이터 (ClientRoute) 구조인 경우
    else if (route.segments) {
      const firstSubway = route.segments.find((s: any) => s.trafficType === 1);
      if (firstSubway && firstSubway.startName) {
        stations.add(firstSubway.startName);
      }
    }
  });
  return Array.from(stations);
}

// ─── 경로 가공 및 실시간 정보 매칭 로직 ──────────────────────────────────────
const LINE_HEADWAY: Record<string, [number, number]> = {
  "1": [5, 8], "2": [3, 5], "3": [5, 8], "4": [5, 8], "5": [6, 9],
  "6": [6, 9], "7": [5, 8], "8": [6, 9], "9": [4, 7],
  "101": [10, 15], "104": [12, 18], "109": [5, 8], "116": [8, 12], "91": [15, 20], "117": [6, 10]
};

function getAverageWait(lineCode: string): number {
  const now = new Date();
  const hour = now.getHours();
  const isPeak = (hour >= 7 && hour < 9) || (hour >= 18 && hour < 20);
  const headways = LINE_HEADWAY[lineCode] || [8, 12];
  return (isPeak ? headways[0] : headways[1]) / 2;
}

export function odsayPathsToClientRoutes(
  paths: any[],
  stationArrivals: RealtimeArrival[]
): ClientRoute[] {
  const routes = paths.map((path) => {
    let cumulativeMin = 0;
    const segments: ClientRouteSegment[] = [];
    const subPaths = path.subPath || [];

    let isRealtimeEnhanced = false;
    let departureWaitMinutes: number | undefined;
    let departureArrivalMsg: string | undefined;
    let departureDirection: string | undefined;
    let departureError: string | undefined;
    let departureIsTimetable = false;

    for (let i = 0; i < subPaths.length; i++) {
      const s = subPaths[i];
      if (s.trafficType === 1) { // Subway
        const lane = s.lane?.[0];
        const lineCode = String(lane?.subwayCode || "");
        const lineName = getLineName(lineCode);
        const targetSubwayId = getSubwayId(lineCode);
        
        const startName = s.startStation?.stationName || "";
        const wayName = s.way || "";

        const matchingArrivals = stationArrivals.filter(
          (a) => 
            a.stationName.includes(startName.replace("역", "")) && 
            String(a.subwayId) === targetSubwayId
        );

        let realtimeWaitMin: number | undefined;
        let realtimeMsg: string | undefined;
        let realtimeError: string | undefined;
        let isTimetable = false;

        if (matchingArrivals.length > 0) {
          let arrival = matchingArrivals.find(a => a.direction.includes(wayName)) || matchingArrivals[0];
          realtimeWaitMin = arrival.arrivalMinutes;
          realtimeMsg = arrival.arrivalMessage;
          isTimetable = arrival.arrivalMessage.includes(":"); 
          
          if (i === 1 || (i === 0 && subPaths.length > 1)) {
            departureWaitMinutes = realtimeWaitMin;
            departureArrivalMsg = realtimeMsg;
            departureDirection = arrival.direction;
            departureIsTimetable = isTimetable;
            isRealtimeEnhanced = true;
          }
        } else {
          realtimeWaitMin = getAverageWait(lineCode);
          realtimeError = "실시간 정보 없음";
        }

        cumulativeMin += (realtimeWaitMin ?? 0) + s.sectionTime;

        segments.push({
          trafficType: 1,
          line: lineCode,
          lineName,
          color: getLineColor(lineCode),
          startName,
          endName: s.endStation?.stationName || "",
          sectionTime: s.sectionTime,
          stationCount: s.stationCount,
          wayName,
          realtimeWaitMinutes: realtimeWaitMin,
          realtimeArrivalMsg: realtimeMsg,
          realtimeError,
          realtimeIsTimetable: isTimetable,
        });
      } else if (s.trafficType === 3) { // Walk
        cumulativeMin += s.sectionTime || 0;
        segments.push({
          trafficType: 3,
          sectionTime: s.sectionTime || 0,
          startName: segments.length > 0 ? segments[segments.length - 1].endName : "출발지",
          endName: i < subPaths.length - 1 ? subPaths[i+1].startStation?.stationName : "도착지",
        });
      }
    }

    const subwaySegs = subPaths.filter((s: any) => s.trafficType === 1);
    const transferCount = Math.max(0, subwaySegs.length - 1);
    const stationCount = subwaySegs.reduce((sum: number, s: any) => sum + (s.stationCount ?? 0), 0);

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
    };
  });

  const labeled = routes.sort((a, b) => a.adjustedTotalMinutes - b.adjustedTotalMinutes);
  if (labeled.length > 0) labeled[0].label = "최단시간";
  const minT = Math.min(...labeled.map(r => r.transferCount));
  const minTRoute = labeled.find(r => r.transferCount === minT && !r.label);
  if (minTRoute) minTRoute.label = "최소환승";

  return labeled;
}

