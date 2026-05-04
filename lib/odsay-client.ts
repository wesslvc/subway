import { ClientRoute, ClientSubPath } from "@/app/api/find-route/route";
import { RealtimeMultiResponse } from "@/app/api/realtime-multi/route";

const ODSAY_BASE = "https://api.odsay.com/v1/api";

const LINE_COLORS: Record<number, string> = {
  1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A4E3",
  5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
  100: "#76C624", 104: "#77C4A3", 107: "#8CC63F", 108: "#0C8E72",
  109: "#FABE00", 110: "#D4003B", 112: "#B0CE18", 113: "#8BCBC8",
};

// ─── ODsay types ──────────────────────────────────────────────────────────────

interface OdsayStation {
  stationID: number;
  stationName: string;
  x: number;
  y: number;
}

interface OdsaySubPath {
  trafficType: number;
  sectionTime: number;
  stationCount?: number;
  lane?: { name: string; subwayCode: number }[];
  startStation?: { stationID: number; stationName: string; x: number; y: number };
  endStation?: { stationID: number; stationName: string; x: number; y: number };
  passStopList?: { stations: { index: number; stationID: number; stationName: string }[] };
  way?: string;
}

interface OdsayPath {
  pathType: number;
  info: { totalTime: number; transferCount: number; totalStationCount: number; payment: number; firstStartStation: string; lastEndStation: string };
  subPath: OdsaySubPath[];
}

// ─── API call (browser — Origin header set automatically) ─────────────────────

async function odsayFetch<T>(endpoint: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${ODSAY_BASE}/${endpoint}?${qs}&apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const data = await res.json() as { result?: T; error?: unknown };
  if (data.error) throw new Error(`ODsay: ${JSON.stringify(data.error)}`);
  return data.result as T;
}

export async function odsaySearchStation(name: string, apiKey: string): Promise<OdsayStation[]> {
  const r = await odsayFetch<{ station?: OdsayStation[] }>(
    "searchStation", { lang: "0", stationName: name, stationType: "1" }, apiKey
  );
  return r.station ?? [];
}

export async function odsaySearchRoutes(
  sx: number, sy: number, ex: number, ey: number, apiKey: string
): Promise<OdsayPath[]> {
  const r = await odsayFetch<{ path?: OdsayPath[] }>(
    "searchPubTransPathT",
    { SX: String(sx), SY: String(sy), EX: String(ex), EY: String(ey), OPT: "0", SearchType: "2" },
    apiKey
  );
  return r.path ?? [];
}

// ─── Convert ODsay paths to ClientRoutes ──────────────────────────────────────

export function odsayPathsToClientRoutes(
  paths: OdsayPath[],
  arrivals: RealtimeMultiResponse["arrivals"]
): ClientRoute[] {
  const routes = paths.map((path) => {
    const segments: ClientSubPath[] = [];
    let adjustedTotal = 0;
    let isRealtimeEnhanced = false;

    for (let i = 0; i < path.subPath.length; i++) {
      const sp = path.subPath[i];

      if (sp.trafficType === 1) {
        const lane = sp.lane?.[0];
        const code = lane?.subwayCode ?? 0;
        segments.push({
          trafficType: 1,
          sectionTime: sp.sectionTime,
          stationCount: sp.stationCount,
          startName: sp.startStation?.stationName ?? "",
          endName: sp.endStation?.stationName ?? "",
          lineName: lane?.name,
          lineCode: code,
          lineColor: LINE_COLORS[code] ?? "#888",
          direction: sp.way,
          stations: sp.passStopList?.stations.map((s) => ({
            index: s.index, name: s.stationName, id: String(s.stationID),
          })),
        });
        adjustedTotal += sp.sectionTime;

      } else if (sp.trafficType === 3) {
        const nextSubway = path.subPath.slice(i + 1).find((s) => s.trafficType === 1);
        const boardingStation = nextSubway?.startStation?.stationName ?? "";
        const walkMin = sp.sectionTime;

        let realtimeWait: number | null = null;
        let realtimeMsg: string | undefined;

        if (nextSubway && boardingStation) {
          const code = nextSubway.lane?.[0]?.subwayCode ?? 0;
          const targetId = `1${String(code).padStart(3, "0")}`;
          const stationArrivals = arrivals[boardingStation] ?? [];
          const match = stationArrivals.find((a) => a.subwayId === targetId);
          if (match) {
            realtimeWait = match.waitMinutes;
            realtimeMsg = match.msg;
            isRealtimeEnhanced = true;
          }
        }

        segments.push({
          trafficType: 3,
          sectionTime: walkMin,
          startName: segments.at(-1)?.endName ?? "",
          endName: nextSubway?.startStation?.stationName ?? "",
          realtimeWaitMinutes: realtimeWait,
          realtimeArrivalMsg: realtimeMsg,
        });
        adjustedTotal += walkMin + (realtimeWait ?? 3);
      }
    }

    return {
      totalMinutes: path.info.totalTime,
      adjustedTotalMinutes: Math.round(adjustedTotal),
      transferCount: path.info.transferCount,
      stationCount: path.info.totalStationCount,
      cost: path.info.payment,
      segments,
      isRealtimeEnhanced,
    } satisfies Omit<ClientRoute, "label">;
  });

  // Sort + label
  routes.sort((a, b) => a.adjustedTotalMinutes - b.adjustedTotalMinutes);
  const labeled = routes as ClientRoute[];
  if (labeled.length > 0) labeled[0].label = "최단시간";
  const minT = Math.min(...labeled.map((r) => r.transferCount));
  const leastTransfer = labeled.find((r) => r.transferCount === minT && !r.label);
  if (leastTransfer) leastTransfer.label = "최소환승";
  const minC = Math.min(...labeled.map((r) => r.cost));
  const cheapest = labeled.find((r) => r.cost === minC && !r.label);
  if (cheapest) cheapest.label = "최소비용";

  return labeled;
}
