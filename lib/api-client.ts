import { RealtimeArrival } from "@/types/subway";

const SEOUL_API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY || "";

function normalizeArrival(raw: Record<string, string>): RealtimeArrival {
  const barvlDt = parseInt(raw.barvlDt || "0", 10);
  const arrivalMinutes = barvlDt === 0 ? 0 : Math.ceil(barvlDt / 60);

  return {
    stationName: raw.statnNm || "",
    line: raw.subwayId || raw.subwayLine || "", // 1075, 1094 등 원본 유지
    direction: raw.trainLineNm || "",
    arrivalMinutes,
    arrivalMessage: raw.arvlMsg2 || `${arrivalMinutes}분 후`,
    trainId: raw.btrainNo || "",
    subwayId: raw.subwayId || "",
    ordkey: raw.ordkey || "",
    isExpress: raw.btrainSttus === "급행",
  };
}

export async function fetchRealtimeArrivals(
  stationName: string
): Promise<RealtimeArrival[]> {
  if (!SEOUL_API_KEY) return [];

  try {
    const cleanName = stationName.replace(/역$/, "");
    const encoded = encodeURIComponent(cleanName);
    const url = `http://swopenAPI.seoul.go.kr/api/subway/${SEOUL_API_KEY}/json/realtimeStationArrival/0/20/${encoded}`;
    
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (data.errorMessage && data.errorMessage.status !== 200) return [];

    const list = data.realtimeArrivalList || [];
    return list.map((raw: Record<string, string>) => normalizeArrival(raw));
  } catch (err) {
    console.error("Seoul API Fetch Error:", err);
    return [];
  }
}

