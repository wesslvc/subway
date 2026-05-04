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

/** Line number → background color for badges */
export function getLineColor(lineCode: number | string): string {
  const map: Record<string, string> = {
    "1": "#0052A4",
    "2": "#00A84D",
    "3": "#EF7C1C",
    "4": "#00A5DE",
    "5": "#996CAC",
    "6": "#CD7C2F",
    "7": "#747F00",
    "8": "#E6186C",
    "9": "#BDB092",
    "101": "#FC4C02", // 공항철도
    "104": "#6789CA", // 경의중앙
    "109": "#77C4A3", // 수인분당
    "110": "#F5A200", // 신분당
  };
  return map[String(lineCode)] ?? "#888";
}

export function getLineName(lineCode: number | string): string {
  const map: Record<string, string> = {
    "1": "1호선",
    "2": "2호선",
    "3": "3호선",
    "4": "4호선",
    "5": "5호선",
    "6": "6호선",
    "7": "7호선",
    "8": "8호선",
    "9": "9호선",
    "101": "공항철도",
    "104": "경의중앙선",
    "109": "수인분당선",
    "110": "신분당선",
  };
  return map[String(lineCode)] ?? `${lineCode}호선`;
}
