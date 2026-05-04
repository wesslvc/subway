import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ROUTE_KEY = process.env.SEOUL_ROUTE_API_KEY ?? "";
const REALTIME_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const test = searchParams.get("test") ?? "location";
  const q = searchParams.get("q") ?? "강남";

  const results: Record<string, unknown> = {
    routeKey: ROUTE_KEY ? `${ROUTE_KEY.slice(0, 8)}...` : "MISSING",
    realtimeKey: REALTIME_KEY ? `${REALTIME_KEY.slice(0, 4)}...` : "MISSING",
    test,
  };

  if (test === "location") {
    // Test openapi.seoul.go.kr location search
    const url = `http://openapi.seoul.go.kr:8088/${ROUTE_KEY}/json/getLocationInfoList/1/10/${encodeURIComponent(q)}/`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      results.url = url;
      results.status = res.status;
      try { results.body = JSON.parse(text); } catch { results.body = text.slice(0, 500); }
    } catch (e) {
      results.error = String(e);
    }
  } else if (test === "route") {
    // Test route between 강남 and 홍대입구 coordinates
    const SX = 127.0276; const SY = 37.4979; // 강남
    const EX = 126.9236; const EY = 37.5573; // 홍대입구
    const url = `http://openapi.seoul.go.kr:8088/${ROUTE_KEY}/json/getPathInfoBySubwayList/1/5/${SX}/${SY}/${EX}/${EY}/`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      results.url = url;
      results.status = res.status;
      try { results.body = JSON.parse(text); } catch { results.body = text.slice(0, 2000); }
    } catch (e) {
      results.error = String(e);
    }
  } else if (test === "realtime") {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${REALTIME_KEY}/json/realtimeStationArrival/0/5/${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      results.url = url;
      results.status = res.status;
      try { results.body = JSON.parse(text); } catch { results.body = text.slice(0, 500); }
    } catch (e) {
      results.error = String(e);
    }
  }

  return NextResponse.json(results);
}
