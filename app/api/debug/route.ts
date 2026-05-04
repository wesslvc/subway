import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ODSAY_KEY = process.env.ODSAY_API_KEY ?? "";
const REALTIME_KEY = process.env.SEOUL_REALTIME_API_KEY ?? "";

async function tryFetch(label: string, url: string): Promise<Record<string, unknown>> {
  const safeUrl = url.replace(ODSAY_KEY, "***").replace(REALTIME_KEY, "***");
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

  const stationParams = new URLSearchParams({ lang: "0", stationName: q, stationType: "1", apiKey: ODSAY_KEY });
  const routeParams = new URLSearchParams({ SX: "127.0276", SY: "37.4979", EX: "126.9236", EY: "37.5573", OPT: "0", SearchType: "2", apiKey: ODSAY_KEY });

  const results = await Promise.all([
    tryFetch("odsay_station", `https://api.odsay.com/v1/api/searchStation?${stationParams}`),
    tryFetch("odsay_route", `https://api.odsay.com/v1/api/searchPubTransPathT?${routeParams}`),
    tryFetch("realtime", `http://swopenapi.seoul.go.kr/api/subway/${REALTIME_KEY}/json/realtimeStationArrival/0/3/${encodeURIComponent(q)}`),
  ]);

  return NextResponse.json({
    odsayKey: ODSAY_KEY ? `${ODSAY_KEY.slice(0, 4)}...(${ODSAY_KEY.length}chars)` : "MISSING",
    results,
  });
}
