import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ROUTE_KEY = process.env.SEOUL_ROUTE_API_KEY ?? "";
const REALTIME_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

async function tryFetch(label: string, url: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 800); }
    return { label, url: url.replace(ROUTE_KEY, "***").replace(REALTIME_KEY, "***"), status: res.status, body };
  } catch (e) {
    return { label, url: url.replace(ROUTE_KEY, "***").replace(REALTIME_KEY, "***"), status: 0, error: String(e) };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "강남";

  const SX = 127.0276; const SY = 37.4979; // 강남
  const EX = 126.9236; const EY = 37.5573; // 홍대입구

  const locationParams = `ServiceKey=${encodeURIComponent(ROUTE_KEY)}&stSrch=${encodeURIComponent(q)}&resultType=json`;
  const routeParams = new URLSearchParams({
    ServiceKey: ROUTE_KEY,
    startX: String(SX), startY: String(SY),
    endX: String(EX), endY: String(EY),
    count: "3", SearchPathType: "0", resultType: "json",
  }).toString();

  const results = await Promise.all([
    tryFetch("https_bus_location", `https://ws.bus.go.kr/api/rest/pathinfo/getLocationInfoList?${locationParams}`),
    tryFetch("http_bus_location", `http://ws.bus.go.kr/api/rest/pathinfo/getLocationInfoList?${locationParams}`),
    tryFetch("https_bus_route", `https://ws.bus.go.kr/api/rest/pathinfo/getPathInfoBySubwayList?${routeParams}`),
    tryFetch("http_bus_route", `http://ws.bus.go.kr/api/rest/pathinfo/getPathInfoBySubwayList?${routeParams}`),
    tryFetch("realtime", `http://swopenapi.seoul.go.kr/api/subway/${REALTIME_KEY}/json/realtimeStationArrival/0/3/${encodeURIComponent(q)}`),
  ]);

  return NextResponse.json({
    routeKey: ROUTE_KEY ? `${ROUTE_KEY.slice(0, 8)}...(${ROUTE_KEY.length}chars)` : "MISSING",
    realtimeKey: REALTIME_KEY ? `${REALTIME_KEY.slice(0, 4)}...(${REALTIME_KEY.length}chars)` : "MISSING",
    results,
  });
}
