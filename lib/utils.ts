
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

export function formatKRW(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

/**
 * ODsay 노선 코드(subwayCode) -> 서울시 실시간 API subwayId 매핑
 * 사용자 피드백 반영: 116(수인분당), 109(신분당), 114(서해선), 91(GTX-A), 112(경강선), 21(인천1호선) 등
 */
const SUBWAY_ID_MAP: Record<string, string> = {
  "1": "1001", "2": "1002", "3": "1003", "4": "1004",
  "5": "1005", "6": "1006", "7": "1007", "8": "1008", "9": "1009",
  "21": "1069",  // 인천 1호선
  "22": "1071",  // 인천 2호선
  "91": "1032",  // GTX-A
  "101": "1065", // 공항철도
  "104": "1063", // 경의중앙선
  "107": "1067", // 경춘선
  "109": "1077", // 신분당선
  "112": "1081", // 경강선
  "113": "1092", // 우이신설선
  "114": "1093", // 서해선
  "116": "1075", // 수인분당선
  "118": "1094", // 신림선
};

/**
 * ODsay 노선 코드 -> 실제 노선 명칭 매핑
 */
const LINE_NAME_MAP: Record<string, string> = {
  "21": "인천1호선",
  "22": "인천2호선",
  "91": "GTX-A",
  "101": "공항철도",
  "104": "경의중앙선",
  "107": "경춘선",
  "109": "신분당선",
  "112": "경강선",
  "113": "우이신설선",
  "114": "서해선",
  "116": "수인분당선",
  "118": "신림선",
};

/**
 * ODsay 코드를 서울시 API용 subwayId로 변환
 */
export function getSubwayId(lineCode: string | number): string {
  const code = String(lineCode);
  if (SUBWAY_ID_MAP[code]) return SUBWAY_ID_MAP[code];
  const num = parseInt(code);
  if (num < 10) return `100${num}`;
  return code;
}

/**
 * 노선 코드를 실제 한글 명칭으로 변환
 */
export function getLineName(lineCode: string | number): string {
  const code = String(lineCode);
  if (LINE_NAME_MAP[code]) return LINE_NAME_MAP[code];
  const num = parseInt(code);
  return num < 10 ? `${num}호선` : `${code}호선`;
}

/** 노선별 고유 색상 반환 */
export function getLineColor(lineCode: number | string): string {
  const map: Record<string, string> = {
    "1": "#0052A4", "2": "#00A84D", "3": "#EF7C1C", "4": "#00A5DE",
    "5": "#996CAC", "6": "#CD7C2F", "7": "#747F00", "8": "#E6186C", "9": "#BDB092",
    "21": "#7CA8D5", // 인천1
    "22": "#ED8B00", // 인천2
    "91": "#9A62A6", // GTX-A
    "101": "#0090D2", // 공항
    "104": "#77C4A3", // 경의중앙
    "107": "#0C8E72", // 경춘
    "109": "#D4003B", // 신분당
    "112": "#0054A6", // 경강
    "113": "#B0CE18", // 우이신설
    "114": "#81A914", // 서해
    "116": "#FABE00", // 수인분당
    "118": "#6789CA", // 신림
  };
  return map[String(lineCode)] || "#888888";
}

```
