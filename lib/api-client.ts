import { RealtimeArrival } from "@/types/subway";

const SEOUL_API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY || "";

function normalizeArrival(raw: Record<string, string>): RealtimeArrival {
  const barvlDt = parseInt(raw.barvlDt || "0", 10);
  const arrivalMinutes = barvlDt === 0 ? 0 : Math.ceil(barvlDt / 60);

  return {
    stationName: raw.statnNm || "",
    // 중요: subwayId 변조하지 않음 (예: 1075, 1094 원본 유지)
    line: raw.subwayId || raw.subwayLine || "", 
    direction: raw.trainLineNm || "",
    arrivalMinutes,
    arrivalMessage: raw.arvlMsg2 || `${arrivalMinutes}분 후`,
    trainId: raw.btrainNo || "",
    subwayId: raw.subwayId || "",
    ordkey: raw.ordkey || "",
    isExpress: raw.btrainSttus === "급행",
  };
}

// ─── 클라이언트 사이드 용 (Next.js 내부 API 라우트 호출) ───
export async function fetchRealtimeArrivals(
  stationName: string
): Promise<RealtimeArrival[]> {
  try {
    const encoded = encodeURIComponent(stationName);
    const url = `/api/arrivals?station=${encoded}`;
    
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    
    const data = await res.json();

    if (data.errorMessage && (data.errorMessage.status === 404 || data.errorMessage.status === "ERROR-336")) {
      return [];
    }

    const arrivals: RealtimeArrival[] = (data.realtimeArrivalList || []).map(
      (raw: Record<string, string>) => normalizeArrival(raw)
    );

    return arrivals;
  } catch (err) {
    console.error("Failed to fetch realtime arrivals:", err);
    return [];
  }
}

// ─── 서버 사이드 용 (app/api/arrivals/route.ts 에서 호출) ───
// 빌드 에러를 해결하기 위해 복구된 함수입니다.
export async function fetchRealtimeArrivalsServer(
  stationName: string
): Promise<RealtimeArrival[]> {
  if (!SEOUL_API_KEY) return [];

  try {
    const cleanName = stationName.replace(/역$/, "");
    const encoded = encodeURIComponent(cleanName);
    const url = `http://swopenAPI.seoul.go.kr/api/subway/${SEOUL_API_KEY}/json/realtimeStationArrival/0/20/${encoded}`;
    
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (data.errorMessage && data.errorMessage.status !== 200) {
      return [];
    }

    const list = data.realtimeArrivalList || [];
    return list.map((raw: Record<string, string>) => normalizeArrival(raw));
  } catch (err) {
    console.error("Seoul API Server Fetch Error:", err);
    return [];
  }
}



