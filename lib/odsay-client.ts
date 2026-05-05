"use client";

import { ClientRoute, RealtimeArrival } from "@/types/subway";
import { getLineName, getSubwayId, getLineColor } from "./utils";
import { searchStation, searchRoutes } from "./odsay-api";

// ─── 누락된 함수 Export (page.tsx 에러 해결용) ────────────────────────────────
export const odsaySearchStation = searchStation;
export const odsaySearchRoutes = searchRoutes;

/**
 * 경로 데이터에서 환승역 목록을 수집하는 헬퍼
 */
export function collectTransferPoints(routes: ClientRoute[]): string[] {
  const points = new Set<string>();
  routes.forEach(route => {
    route.segments.forEach((seg, idx) => {
      if (idx > 0) points.add(seg.startName);
    });
  });
  return Array.from(points);
}

/**
 * 경로 데이터에서 출발역 목록을 수집하는 헬퍼
 */
export function collectDepartureStations(routes: ClientRoute[]): string[] {
  const stations = new Set<string>();
  routes.forEach(route => {
    const firstSubway = route.segments.find(s => s.trafficType === 1);
    if (firstSubway) stations.add(firstSubway.startName);
  });
  return Array.from(stations);
}

// ─── 기존 로직 통합 ──────────────────────────────────────────────────────────
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
    const segments: any[] = [];
    const subPaths = path.subPath || [];

    let isRealtimeEnhanced = false;
    let departureWaitMinutes: number | undefined;
    let departureArrivalMsg: string | undefined;
    let departureDirection: string | undefined;
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
          startName: segments.at(-1)?.endName || "출발지",
          endName: i < subPaths.length - 1 ? subPaths[i+1].startStation?.stationName : "도착지",
        });
      }
    }

    return {
      totalMinutes: path.info.totalTime,
      adjustedTotalMinutes: Math.round(cumulativeMin),
      transferCount: path.info.transferCount,
      stationCount: path.info.totalStationCount,
      cost: path.info.payment,
      segments,
      isRealtimeEnhanced,
      departureWaitMinutes,
      departureArrivalMsg,
      departureDirection,
      departureIsTimetable,
    };
  });

  return routes.sort((a, b) => a.adjustedTotalMinutes - b.adjustedTotalMinutes) as ClientRoute[];
}

