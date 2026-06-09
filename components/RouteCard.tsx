"use client";

import { ClientRoute, ClientSubPath, getLineLabel, getLineFullName } from "@/lib/odsay-client";
import { formatKRW } from "@/lib/utils";

interface RouteCardProps {
  route: ClientRoute;
  isSelected: boolean;
  onClick: () => void;
}

const LABEL_COLORS: Record<string, string> = {
  "최단시간": "#2563EB",
  "최소환승": "#16A34A",
  "최소비용": "#D97706",
};

export default function RouteCard({ route, isSelected, onClick }: RouteCardProps) {
  const displayMinutes = route.adjustedTotalMinutes || route.totalMinutes;
  const subwaySegs = route.segments.filter((s) => s.trafficType === 1);

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: isSelected ? "#0D1B3E" : "#111",
        border: `1px solid ${isSelected ? "#2563EB" : "#222"}`,
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "'Barlow Condensed', sans-serif",
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#333"; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#222"; }}
    >
      <div style={{ padding: "14px 16px" }}>

        {/* Top row: time + labels | stats */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div>
              <span style={{ fontSize: "2.8rem", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em", color: "#fff" }}>
                {displayMinutes}
              </span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "#888", marginLeft: 3 }}>분 뒤 도착</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {route.label && (
                <span style={{
                  fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.2em",
                  textTransform: "uppercase", color: LABEL_COLORS[route.label] ?? "#888",
                  border: `1px solid ${LABEL_COLORS[route.label] ?? "#888"}`, padding: "1px 6px",
                }}>
                  {route.label}
                </span>
              )}
              {route.isRealtimeEnhanced && (
                <span style={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#22C55E" }}>
                  ● 실시간 반영
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{formatKRW(route.cost)}</div>
            <div style={{ fontSize: "0.75rem", color: "#555", marginTop: 2 }}>
              환승 {route.transferCount}회 · {route.stationCount}개역
            </div>
          </div>
        </div>

        {/* Line strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {subwaySegs.map((seg, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <span style={{ color: "#333", fontSize: "0.75rem" }}>→</span>}
              <LinePill seg={seg} />
            </div>
          ))}
        </div>

        {/* Departure wait + transfer waits */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1E1E1E", display: "flex", flexDirection: "column", gap: 4 }}>
          {/* 출발역 대기 */}
          {route.departureError === "운행종료" ? (
            <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#F59E0B", letterSpacing: "0.05em" }}>
              ⚑ 운행종료 — 막차가 끊겼습니다
            </div>
          ) : route.departureWaitMinutes != null ? (
            <div style={{ fontSize: "0.68rem", fontWeight: 700, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#555" }}>{subwaySegs[0]?.startName} 출발 ·</span>
              {route.departureIsTimetable ? (
                <>
                  <span style={{ color: "#666" }}>배차 추정</span>
                  <span style={{ color: "#888" }}>~{route.departureWaitMinutes}분 대기</span>
                </>
              ) : (
                <>
                  {route.departureDirection && (
                    <span style={{ color: "#16A34A", fontWeight: 800 }}>{route.departureDirection}</span>
                  )}
                  <span style={{ color: "#22C55E" }}>
                    {route.departureWaitMinutes === 0 ? "곧 도착" : `${route.departureWaitMinutes}분 후 도착`}
                  </span>
                  {route.departureArrivalMsg && (
                    <span style={{ color: "#555" }}>({route.departureArrivalMsg})</span>
                  )}
                </>
              )}
            </div>
          ) : null}

          {/* 환승역 대기 */}
          {route.segments.filter((s) => s.trafficType === 3).map((s, i) => (
            <div key={i} style={{ fontSize: "0.68rem", fontWeight: 600, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#555" }}>{s.endName} 환승 ·</span>
              {s.realtimeDirection && !s.realtimeError && (
                <span style={{ color: "#93C5FD", fontWeight: 800 }}>{s.realtimeDirection}</span>
              )}
              {s.realtimeError === "운행종료" ? (
                <span style={{ color: "#F59E0B", fontWeight: 800 }}>⚑ 운행종료</span>
              ) : s.realtimeIsTimetable ? (
                <>
                  <span style={{ color: "#666" }}>배차 추정</span>
                  <span style={{ color: "#888" }}>~{s.realtimeWaitMinutes}분 대기</span>
                </>
              ) : s.realtimeError ? (
                <span style={{ color: "#EF4444" }}>오류 ({s.realtimeError})</span>
              ) : s.realtimeWaitMinutes === 0 ? (
                <span style={{ color: "#60A5FA" }}>바로 탑승</span>
              ) : s.realtimeWaitMinutes != null ? (
                <span style={{ color: "#60A5FA" }}>대기 {s.realtimeWaitMinutes}분</span>
              ) : (
                <span style={{ color: "#555" }}>-</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LinePill({ seg }: { seg: ClientSubPath }) {
  const code = seg.lineCode;
  const isNumbered = code !== undefined && code >= 1 && code <= 9;
  const label = getLineLabel(code);
  const fullName = getLineFullName(code, seg.lineName);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", padding: "2px 7px 2px 4px",
    }}>
      {isNumbered ? (
        <div style={{
          width: 16, height: 16, borderRadius: "50%", backgroundColor: seg.lineColor ?? "#888",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.6rem", fontWeight: 900, color: "#fff", flexShrink: 0,
        }}>
          {label}
        </div>
      ) : (
        <div style={{
          height: 16, borderRadius: 3, backgroundColor: seg.lineColor ?? "#888",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 4px", fontSize: "0.55rem", fontWeight: 900, color: "#fff",
          flexShrink: 0, whiteSpace: "nowrap",
        }}>
          {label}
        </div>
      )}
      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#aaa" }}>
        {fullName}
      </span>
      <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#666" }}>
        {seg.stationCount}개역
      </span>
    </div>
  );
}
