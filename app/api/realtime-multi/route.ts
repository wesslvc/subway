import { NextRequest, NextResponse } from "next/server";
import { getRealtimeArrivals } from "@/lib/seoul-api";

export const runtime = "nodejs";
// Seoul API는 한국 IP에서만 안정적으로 응답 — Vercel ICN1(서울) 리전 우선
export const preferredRegion = ["icn1", "sin1", "hkg1"];

const REALTIME_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

type ArrivalEntry = {
  subwayId: string;
  barvlDt: number;
  msg: string;
  bstatnNm: string;
  trainLineNm: string;
  updnLine: string;  // 상행/하행/내선/외선
  arvlCd: string;    // 0=진입,1=도착,2=출발,3=전역출발,4=전역진입,5=전역도착,99=운행중
};
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
        arrivals[name] = {
          list: list
            .map((a) => ({
              subwayId: a.subwayId,
              barvlDt: parseInt(a.barvlDt, 10),
              msg: a.arvlMsg2,
              bstatnNm: a.bstatnNm,
              trainLineNm: a.trainLineNm,
              updnLine: a.updnLine,
              arvlCd: a.arvlCd ?? "",
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
