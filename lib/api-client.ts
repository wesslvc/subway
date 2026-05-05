import { RealtimeArrival } from "@/types/subway";

const SEOUL_API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY || "";

// Normalize Seoul API response to our RealtimeArrival type
function normalizeArrival(raw: Record<string, string>): RealtimeArrival {
  const barvlDt = parseInt(raw.barvlDt || "0", 10); // seconds remaining
  const arvlMsg2 = raw.arvlMsg2 || "";
  const arvlMsg3 = raw.arvlMsg3 || "";

  // barvlDt = 0 means "arriving now" or "at station"
  const arrivalMinutes = barvlDt === 0 ? 0 : Math.ceil(barvlDt / 60);

  return {
    stationName: raw.statnNm || "",
    line: raw.subwayId?.replace("10", "") || raw.subwayLine || "",
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
  if (!SEOUL_API_KEY) {
    return getMockArrivals(stationName);
  }

  try {
    const encoded = encodeURIComponent(stationName);
    const url = `/api/arrivals?station=${encoded}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    return data.arrivals || [];
  } catch (err) {
    console.error("Failed to fetch realtime arrivals:", err);
    return getMockArrivals(stationName);
  }
}

// Server-side fetch (used in API routes)
export async function fetchRealtimeArrivalsServer(
  stationName: string
): Promise<RealtimeArrival[]> {
  const key = process.env.NEXT_PUBLIC_SEOUL_API_KEY || process.env.SEOUL_API_KEY || "";

  if (!key) {
    return getMockArrivals(stationName);
  }

  try {
    const encoded = encodeURIComponent(stationName);
    const url = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/30/${encoded}`;

    const res = await fetch(url, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Seoul API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.errorMessage) {
      if (data.errorMessage.status === 404 || data.errorMessage.status === "ERROR-336") {
        // No arrivals (train not running or off hours)
        return [];
      }
    }

    const arrivals: RealtimeArrival[] = (data.realtimeArrivalList || []).map(
      (raw: Record<string, string>) => normalizeArrival(raw)
    );

    return arrivals;
  } catch (err) {
    console.error("Failed to fetch realtime arrivals (server):", err);
    return getMockArrivals(stationName);
  }
}

// Mock arrivals for demo mode (when no API key)
function getMockArrivals(stationName: string): RealtimeArrival[] {
  const now = new Date();
  const baseMinutes = (now.getMinutes() % 5) + 1;

  return [
    {
      stationName,
      line: "5",
      direction: "방화행",
      arrivalMinutes: baseMinutes,
      arrivalMessage: `${baseMinutes}분 후`,
      trainId: "5001",
      subwayId: "1065",
    },
    {
      stationName,
      line: "5",
      direction: "하남검단산행",
      arrivalMinutes: baseMinutes + 3,
      arrivalMessage: `${baseMinutes + 3}분 후`,
      trainId: "5002",
      subwayId: "1065",
    },
    {
      stationName,
      line: "3",
      direction: "오금행",
      arrivalMinutes: 2,
      arrivalMessage: "2분 후",
      trainId: "3001",
      subwayId: "1063",
    },
    {
      stationName,
      line: "3",
      direction: "대화행",
      arrivalMinutes: 4,
      arrivalMessage: "4분 후",
      trainId: "3002",
      subwayId: "1063",
    },
  ];
}
