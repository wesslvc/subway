/**
 * 서울시 지하철 실시간 도착정보 API (swopenAPI.seoul.go.kr)
 * URL: /api/subway/{KEY}/json/realtimeStationArrival/{START}/{END}/{STATION}
 *
 * JSON 응답은 두 가지 구조 중 하나:
 *   구조 A: { errorMessage: { status, code, message }, realtimeArrivalList: [...] }
 *   구조 B: { realtimeStationArrival: { RESULT: { code, message }, row: [...] } }
 */

const REALTIME_BASE = "http://swopenAPI.seoul.go.kr/api/subway";

export interface RealtimeArrivalItem {
  subwayId: string;  // "1001"~"1009" 등
  statnNm: string;
  barvlDt: string;   // 도착 잔여 시간 (초, 문자열)
  arvlMsg2: string;  // 첫번째 도착 메시지
  arvlMsg3: string;
  arvlCd: string;
  updnLine: string;
  trainLineNm: string;
  bstatnNm: string;
}

function ensureArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export async function getRealtimeArrivals(
  stationName: string,
  apiKey: string,
): Promise<RealtimeArrivalItem[]> {
  // "역" 제거 후 API 호출 (Seoul API DB는 "역" 없는 표기 사용)
  const apiName = stationName.endsWith("역") ? stationName.slice(0, -1) : stationName;
  const url = `${REALTIME_BASE}/${apiKey}/json/realtimeStationArrival/0/200/${encodeURIComponent(apiName)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP-${res.status}`);

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`JSON-PARSE-ERR: ${text.slice(0, 120)}`);
  }

  // INFO-2xx 계열 = 데이터 없음 (정상적 빈 응답) → 빈 배열 반환
  const isNoData = (code: unknown) =>
    typeof code === "string" && code.startsWith("INFO-") && code !== "INFO-000";

  // 구조 A: { errorMessage, realtimeArrivalList }
  if (data.errorMessage !== undefined) {
    const em = data.errorMessage as Record<string, unknown>;
    if (em.status !== 200) {
      if (isNoData(em.code)) return [];
      throw new Error(`${em.code ?? "ERR"}: ${em.message ?? "오류"}`);
    }
    return ensureArray(data.realtimeArrivalList as RealtimeArrivalItem[] | undefined);
  }

  // 구조 B: { realtimeStationArrival: { RESULT, row } }
  if (data.realtimeStationArrival !== undefined) {
    const inner = data.realtimeStationArrival as Record<string, unknown>;
    const result = inner.RESULT as Record<string, unknown> | undefined;
    if (result?.code !== "INFO-000") {
      if (isNoData(result?.code)) return [];
      throw new Error(`${result?.code ?? "ERR"}: ${result?.message ?? "오류"}`);
    }
    return ensureArray(inner.row as RealtimeArrivalItem[] | undefined);
  }

  // 구조 C: flat { code, message, status } at root (에러 응답)
  if (typeof data.code === "string") {
    if (data.code === "INFO-000" || isNoData(data.code)) return [];
    throw new Error(`${data.code}: ${(data.message as string) ?? "오류"}`);
  }

  throw new Error(`STRUCT-ERR: ${text.slice(0, 200)}`);
}
