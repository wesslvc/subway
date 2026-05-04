import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ROUTE_KEY = process.env.SEOUL_ROUTE_API_KEY ?? "";
const REALTIME_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

async function tryFetch(url: string): Promise<{ url: string; status: number; body: unknown }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 1000); }
    return { url, status: res.status, body };
  } catch (e) {
    return { url, status: 0, body: String(e) };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "강남";

  const keyShort = ROUTE_KEY ? `${ROUTE_KEY.slice(0, 8)}... (${ROUTE_KEY.length}chars)` : "MISSING";

  // Try multiple URL formats to figure out which one works
  const SX = 127.0276; const SY = 37.4979; // 강남
  const EX = 126.9236; const EY = 37.5573; // 홍대입구

  const results = await Promise.all([
    // Format 1: openapi.seoul.go.kr with json
    tryFetch(`http://openapi.seoul.go.kr:8088/${ROUTE_KEY}/json/getLocationInfoList/1/5/${encodeURIComponent(q)}/`),
    // Format 2: openapi.seoul.go.kr with xml
    tryFetch(`http://openapi.seoul.go.kr:8088/${ROUTE_KEY}/xml/getLocationInfoList/1/5/${encodeURIComponent(q)}/`),
    // Format 3: ws.bus.go.kr (original, with url-encoded key)
    tryFetch(`http://ws.bus.go.kr/api/rest/pathinfo/getLocationInfoList?ServiceKey=${encodeURIComponent(ROUTE_KEY)}&stSrch=${encodeURIComponent(q)}&resultType=json`),
    // Format 4: route API on openapi.seoul.go.kr
    tryFetch(`http://openapi.seoul.go.kr:8088/${ROUTE_KEY}/json/getPathInfoBySubwayList/1/5/${SX}/${SY}/${EX}/${EY}/`),
    // Format 5: realtime API (we know this works)
    tryFetch(`http://swopenapi.seoul.go.kr/api/subway/${REALTIME_KEY}/json/realtimeStationArrival/0/3/${encodeURIComponent(q)}`),
  ]);

  return NextResponse.json({
    routeKey: keyShort,
    realtimeKey: REALTIME_KEY ? `${REALTIME_KEY.slice(0, 4)}... (${REALTIME_KEY.length}chars)` : "MISSING",
    tests: {
      "1_seoul_json_location": results[0],
      "2_seoul_xml_location": results[1],
      "3_wsbus_location": results[2],
      "4_seoul_route": results[3],
      "5_realtime_check": results[4],
    },
  });
}
