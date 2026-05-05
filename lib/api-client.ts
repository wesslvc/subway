import { RealtimeArrival } from "@/types/subway";

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



