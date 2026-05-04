/**
 * 서울시 지하철 실시간 도착정보 API (swopenAPI.seoul.go.kr)
 * URL: /api/subway/{KEY}/json/realtimeStationArrival/{START}/{END}/{STATION_NAME}
 *
 * JSON 응답 구조:
 * {
 *   "realtimeStationArrival": {
 *     "RESULT": { "code": "INFO-000", "message": "정상 처리되었습니다.", "status": 200 },
 *     "row": [ { subwayId, barvlDt, arvlMsg2, ... } ]
 *   }
 * }
 */

const REALTIME_BASE = "http://swopenAPI.seoul.go.kr/api/subway";

export interface RealtimeArrivalItem {
  subwayId: string;  // "1001"~"1009", "1063" 등
  statnNm: string;   // 역명
  barvlDt: string;   // 도착 잔여 시간 (초, 문자열)
  arvlMsg2: string;  // 첫번째 도착 메시지 ("2분 후", "도착" 등)
  arvlMsg3: string;  // 두번째 도착 메시지
  arvlCd: string;    // 도착코드 (0:진입, 1:도착, 2:출발, ...)
  updnLine: string;  // 상하행 ("상행"/"하행")
  trainLineNm: string;
  bstatnNm: string;  // 종착역명
}

interface SeoulApiResult {
  code: string;
  message: string;
  status: number;
}

interface SeoulRealtimeResponse {
  realtimeStationArrival: {
    RESULT: SeoulApiResult;
    row?: RealtimeArrivalItem | RealtimeArrivalItem[];
  };
}

function ensureArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * 특정 역의 실시간 도착정보를 조회합니다.
 * 에러 시 에러코드를 포함한 메시지로 throw합니다.
 */
export async function getRealtimeArrivals(
  stationName: string,
  apiKey: string,
): Promise<RealtimeArrivalItem[]> {
  const url = `${REALTIME_BASE}/${apiKey}/json/realtimeStationArrival/0/30/${encodeURIComponent(stationName)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP-${res.status}`);

  const data: SeoulRealtimeResponse = await res.json();
  const inner = data?.realtimeStationArrival;
  if (!inner) throw new Error("PARSE-ERR: 응답 구조 이상");

  const result = inner.RESULT;
  if (result?.code !== "INFO-000") {
    throw new Error(`${result?.code ?? "UNKNOWN"}: ${result?.message ?? "알 수 없는 오류"}`);
  }

  return ensureArray(inner.row);
}
