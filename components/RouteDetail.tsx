"use client";

import { ClientRoute, ClientSubPath } from "@/lib/odsay-client";
import { formatMinutes, formatKRW } from "@/lib/utils";

interface RouteDetailProps {
  route: ClientRoute;
  fromName: string;
  toName: string;
}

const FONT = "'Barlow Condensed', sans-serif";

export default function RouteDetail({ route, fromName, toName }: RouteDetailProps) {
  const displayMinutes = route.adjustedTotalMinutes || route.totalMinutes;

  return (
    <div
      style={{
        backgroundColor: "#111",
        border: "1px solid #222",
        fontFamily: FONT,
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #1E1E1E",
          padding: "16px 20px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#444",
              marginBottom: 4,
            }}
          >
            Route Detail
          </div>
          <div
            style={{
              fontSize: "3.5rem",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "#fff",
            }}
          >
            {displayMinutes}
            <span style={{ fontSize: "1.5rem", fontWeight: 600, marginLeft: 4, color: "#aaa" }}>분</span>
          </div>
          {route.label && (
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#2563EB",
                marginTop: 4,
              }}
            >
              {route.label}
            </div>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#444", marginBottom: 4 }}>
            Summary
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
            {formatKRW(route.cost)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#555", marginTop: 2 }}>
            환승 {route.transferCount}회
          </div>
          <div style={{ fontSize: "0.75rem", color: "#555" }}>
            {route.stationCount}개역
          </div>
          {route.isRealtimeEnhanced && (
            <div
              style={{
                marginTop: 6,
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#22C55E",
                display: "flex",
                alignItems: "center",
                gap: 4,
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#22C55E",
                  display: "inline-block",
                  animation: "blink 1.8s ease-in-out infinite",
                }}
              />
              실시간 반영
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: "20px" }}>
        {route.segments.map((seg, i) => {
          if (seg.trafficType === 1) {
            return <SubwaySegment key={i} seg={seg} isLast={i === route.segments.length - 1} />;
          }
          if (seg.trafficType === 3) {
            return <WalkSegment key={i} seg={seg} />;
          }
          return null;
        })}

        {/* Final destination dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <div style={{ width: 20, flexShrink: 0, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#EF4444",
                border: "2px solid #EF4444",
              }}
            />
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
            {route.segments[route.segments.length - 1]?.endName ?? toName}
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#555", marginLeft: 6 }}>도착</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubwaySegment({ seg, isLast }: { seg: ClientSubPath; isLast: boolean }) {
  const color = seg.lineColor ?? "#888";
  const stops = seg.stations ?? [];

  return (
    <div>
      {/* Start station */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 20, flexShrink: 0, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: color,
              border: "2px solid #fff",
              zIndex: 1,
              position: "relative",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
            {seg.startName}
          </span>
          <LineTag seg={seg} />
        </div>
      </div>

      {/* Vertical line + segment info */}
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{ width: 20, flexShrink: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 2, backgroundColor: color, opacity: 0.5, minHeight: 48 }} />
        </div>
        <div style={{ paddingLeft: 12, paddingTop: 6, paddingBottom: 6, flex: 1 }}>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#666",
              letterSpacing: "0.05em",
            }}
          >
            {seg.direction && (
              <span style={{ color: "#888" }}>{seg.direction}행 · </span>
            )}
            {seg.stationCount != null ? `${seg.stationCount}개역 · ` : ""}
            {seg.sectionTime}분
          </div>
          {/* Intermediate stops (collapsed) */}
          {stops.length > 2 && (
            <details>
              <summary
                style={{
                  fontSize: "0.7rem",
                  color: "#444",
                  cursor: "pointer",
                  marginTop: 4,
                  letterSpacing: "0.05em",
                  listStyle: "none",
                  userSelect: "none",
                }}
              >
                ▸ 경유역 {stops.length - 2}개 더보기
              </summary>
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
                {stops.slice(1, -1).map((s, i) => (
                  <span
                    key={i}
                    style={{ fontSize: "0.7rem", color: "#444" }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function WalkSegment({ seg }: { seg: ClientSubPath }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "8px 0",
      }}
    >
      <div style={{ width: 20, flexShrink: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9rem",
          }}
        >
          🚶
        </div>
      </div>
      <div>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#666" }}>
          {seg.startName} 환승 · 도보 {seg.sectionTime}분
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            marginTop: 3,
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: seg.realtimeArrivalMsg ? "#22C55E" : "#888",
          }}
        >
          {seg.realtimeArrivalMsg ? (
            <>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: "#22C55E",
                  display: "inline-block",
                  animation: "blink 1.8s ease-in-out infinite",
                }}
              />
              다음 열차 {seg.realtimeArrivalMsg}
            </>
          ) : (
            <>대기 약 {seg.realtimeWaitMinutes ?? 3}분</>
          )}
        </div>
      </div>
    </div>
  );
}

function LineTag({ seg }: { seg: ClientSubPath }) {
  if (!seg.lineColor || !seg.lineCode) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px 1px 4px",
        backgroundColor: seg.lineColor + "22",
        border: `1px solid ${seg.lineColor}66`,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          backgroundColor: seg.lineColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.55rem",
          fontWeight: 900,
          color: "#fff",
        }}
      >
        {seg.lineCode}
      </div>
      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: seg.lineColor }}>
        {seg.lineCode}호선
      </span>
    </div>
  );
}
