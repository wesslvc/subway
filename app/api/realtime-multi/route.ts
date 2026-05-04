import { NextRequest, NextResponse } from "next/server";
import { getRealtimeArrivals } from "@/lib/seoul-api";

export const runtime = "nodejs";

const REALTIME_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

export interface RealtimeMultiResponse {
  arrivals: Record<string, { subwayId: string; waitMinutes: number; msg: string }[]>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stations = (searchParams.get("stations") ?? "").split(",").filter(Boolean);

  const arrivals: RealtimeMultiResponse["arrivals"] = {};

  await Promise.all(
    stations.map(async (name) => {
      try {
        const list = await getRealtimeArrivals(name, REALTIME_KEY);
        const seen = new Set<string>();
        arrivals[name] = [];
        for (const a of list) {
          if (seen.has(a.subwayId)) continue;
          const secs = parseInt(a.barvlDt, 10);
          if (!isNaN(secs) && secs >= 0) {
            arrivals[name].push({ subwayId: a.subwayId, waitMinutes: Math.ceil(secs / 60), msg: a.arvlMsg2 });
            seen.add(a.subwayId);
          }
        }
      } catch {
        arrivals[name] = [];
      }
    })
  );

  return NextResponse.json<RealtimeMultiResponse>({ arrivals });
}
