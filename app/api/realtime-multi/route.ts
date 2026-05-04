import { NextRequest, NextResponse } from "next/server";
import { getRealtimeArrivals } from "@/lib/seoul-api";

export const runtime = "nodejs";

const REALTIME_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

type ArrivalEntry = { subwayId: string; barvlDt: number; msg: string };
type StationResult = { list: ArrivalEntry[]; error?: string };

export interface RealtimeMultiResponse {
  arrivals: Record<string, StationResult>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stations = (searchParams.get("stations") ?? "")
    .split(",")
    .map((s) => { try { return decodeURIComponent(s); } catch { return s; } })
    .filter(Boolean);

  const arrivals: Record<string, StationResult> = {};

  await Promise.all(
    stations.map(async (name) => {
      try {
        const list = await getRealtimeArrivals(name, REALTIME_KEY);
        // 중복 제거 없이 모든 열차 반환 — 누적 시간 기반 탐색에 필요
        arrivals[name] = {
          list: list
            .map((a) => ({
              subwayId: a.subwayId,
              barvlDt: parseInt(a.barvlDt, 10),
              msg: a.arvlMsg2,
            }))
            .filter((a) => !isNaN(a.barvlDt) && a.barvlDt >= 0),
        };
      } catch (e) {
        arrivals[name] = {
          list: [],
          error: e instanceof Error ? e.message : "UNKNOWN",
        };
      }
    })
  );

  return NextResponse.json<RealtimeMultiResponse>({ arrivals });
}
