import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ROUTE_KEY = process.env.SEOUL_ROUTE_API_KEY ?? "";
const REALTIME_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

async function tryFetch(label: string, url: string): Promise<Record<string, unknown>> {
  const safeUrl = url.replace(ROUTE_KEY, "***KEY***").replace(REALTIME_KEY, "***RT***");
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 500); }
    return { label, url: safeUrl, status: res.status, body };
  } catch (e) {
    return { label, url: safeUrl, status: 0, error: String(e) };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "강남";
  const key = encodeURIComponent(ROUTE_KEY);
  const name = encodeURIComponent(q);

  const results = await Promise.all([
    // Base server check
    tryFetch("ws.bus.go.kr root", "http://ws.bus.go.kr/"),

    // Current path (returning 404)
    tryFetch("pathinfo path", `http://ws.bus.go.kr/api/rest/pathinfo/getLocationInfoList?ServiceKey=${key}&stSrch=${name}&resultType=json`),

    // Alternative paths
    tryFetch("pathInfo2 path", `http://ws.bus.go.kr/api/rest/pathInfo2/getLocationInfoList?ServiceKey=${key}&stSrch=${name}&resultType=json`),
    tryFetch("transinfo path", `http://ws.bus.go.kr/api/rest/transinfo/getLocationInfoList?ServiceKey=${key}&stSrch=${name}&resultType=json`),
    tryFetch("BusRoute path", `http://ws.bus.go.kr/api/rest/BusRouteService/getLocationInfoList?ServiceKey=${key}&stSrch=${name}&resultType=json`),

    // data.go.kr gateway variants
    tryFetch("apis.data.go.kr v1", `https://apis.data.go.kr/6110000/topisOdSaasSvc/getLocationInfoList?serviceKey=${key}&stSrch=${name}&resultType=json`),
    tryFetch("apis.data.go.kr v2", `https://apis.data.go.kr/B090041/openapi/service/PathInfoService/getLocationInfoList?serviceKey=${key}&stSrch=${name}&_type=json`),

    // Realtime check (known working)
    tryFetch("realtime (sanity)", `http://swopenapi.seoul.go.kr/api/subway/${REALTIME_KEY}/json/realtimeStationArrival/0/3/${name}`),
  ]);

  return NextResponse.json({
    routeKey: ROUTE_KEY ? `${ROUTE_KEY.slice(0, 8)}...(${ROUTE_KEY.length}chars)` : "MISSING",
    results,
  });
}
