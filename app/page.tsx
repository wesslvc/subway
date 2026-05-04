"use client";

import { useState, useCallback } from "react";
import SearchForm from "@/components/SearchForm";
import RouteCard from "@/components/RouteCard";
import RouteDetail from "@/components/RouteDetail";
import { ClientRoute, odsaySearchStation, odsaySearchRoutes, odsayPathsToClientRoutes, collectTransferPoints, collectDepartureStations, RealtimeArrivals } from "@/lib/odsay-client";

export default function HomePage() {
  const [routes, setRoutes] = useState<ClientRoute[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    fromName: string;
    toName: string;
    searchTime: string;
    isRealtimeData: boolean;
  } | null>(null);

  const handleSearch = useCallback(async (from: string, to: string) => {
    setIsLoading(true);
    setError(null);
    setRoutes([]);
    setMeta(null);
    setSelectedIndex(0);

    const apiKey = process.env.NEXT_PUBLIC_ODSAY_API_KEY ?? "";
    if (!apiKey) {
      setError("ODsay API 키가 없습니다. Vercel 환경변수 NEXT_PUBLIC_ODSAY_API_KEY를 확인하세요.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. 역 좌표 검색 (브라우저에서 직접 ODsay 호출 — 도메인 인증 통과)
      const [fromStations, toStations] = await Promise.all([
        odsaySearchStation(from, apiKey),
        odsaySearchStation(to, apiKey),
      ]);

      if (fromStations.length === 0) { setError(`'${from}' 역을 찾을 수 없습니다.`); return; }
      if (toStations.length === 0) { setError(`'${to}' 역을 찾을 수 없습니다.`); return; }

      const fromSt = fromStations[0];
      const toSt = toStations[0];

      // 2. 경로 검색 — 출발/도착역명을 직접 검증해 ODsay가 인접역으로 대체한 경로 제외
      const paths = await odsaySearchRoutes(fromSt.x, fromSt.y, toSt.x, toSt.y, apiKey, fromSt.stationName, toSt.stationName);
      if (paths.length === 0) { setError(`'${fromSt.stationName}'역에서 '${toSt.stationName}'역으로 가는 지하철 경로가 없습니다.`); return; }

      // 3. 실시간 도착정보 수집 — 출발역 + 환승역 모두
      const transferPoints = collectTransferPoints(paths);
      const depStations = collectDepartureStations(paths);
      const allStations = [...new Set([
        ...depStations,
        ...transferPoints.map((p) => p.stationName),
      ])];
      let arrivals: RealtimeArrivals = {};
      if (allStations.length > 0) {
        const encoded = allStations.map((n) => encodeURIComponent(n)).join(",");
        const rtRes = await fetch(`/api/realtime-multi?stations=${encoded}`);
        if (rtRes.ok) ({ arrivals } = await rtRes.json() as { arrivals: RealtimeArrivals });
      }

      // 4. 변환 + 표시
      const clientRoutes = odsayPathsToClientRoutes(paths, arrivals);
      setRoutes(clientRoutes);
      setMeta({
        fromName: fromSt.stationName,
        toName: toSt.stationName,
        searchTime: new Date().toISOString(),
        isRealtimeData: clientRoutes.some((r) => r.isRealtimeEnhanced),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectedRoute = routes[selectedIndex] ?? null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0D0D0D" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b" style={{ borderColor: "#1E1E1E" }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-end justify-between">
          <div>
            <p
              className="text-xs font-bold tracking-[0.3em] uppercase mb-0.5"
              style={{ color: "#555", fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Seoul Metropolitan Subway
            </p>
            <h1
              className="text-4xl sm:text-5xl font-black uppercase leading-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em" }}
            >
              METRO
              <span style={{ color: "#2563EB" }}> FINDER</span>
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
              const colors: Record<number, string> = {
                1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A4E3",
                5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
              };
              return (
                <div
                  key={n}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-xs"
                  style={{ backgroundColor: colors[n] }}
                >
                  {n}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Search bar ─────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-b"
        style={{ borderColor: "#1E1E1E", backgroundColor: "#111111" }}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 border animate-pulse"
                style={{
                  backgroundColor: "#111",
                  borderColor: "#222",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
            <p
              className="text-center text-xs uppercase tracking-widest mt-2"
              style={{ color: "#444", fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              실시간 열차 데이터 분석 중...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div
            className="border px-5 py-4 text-sm font-bold uppercase tracking-wider flex items-center gap-3"
            style={{ borderColor: "#EF4444", color: "#EF4444", backgroundColor: "#1A0A0A" }}
          >
            <span className="text-lg">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {!isLoading && routes.length > 0 && meta && (
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── Left: route list ─────────────────────────── */}
            <div className="lg:w-[420px] flex-shrink-0">
              {/* Meta bar */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "#555", fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {meta.fromName}
                  <span style={{ color: "#2563EB" }}> → </span>
                  {meta.toName}
                  <span className="ml-2" style={{ color: "#333" }}>
                    ({routes.length}개 경로)
                  </span>
                </div>
                {meta.isRealtimeData && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full blink" style={{ backgroundColor: "#22C55E" }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22C55E" }}>
                      실시간
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {routes.map((route, i) => (
                  <div key={i} className="fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <RouteCard
                      route={route}
                      isSelected={selectedIndex === i}
                      onClick={() => setSelectedIndex(i)}
                    />
                  </div>
                ))}
              </div>

              <p
                className="mt-4 text-xs uppercase tracking-widest text-center"
                style={{ color: "#333", fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {new Date(meta.searchTime).toLocaleTimeString("ko-KR")} 기준
              </p>
            </div>

            {/* ── Right: route detail ──────────────────────── */}
            <div className="flex-1 min-w-0">
              {selectedRoute && (
                <div className="slide-in">
                  <RouteDetail
                    route={selectedRoute}
                    fromName={meta.fromName}
                    toName={meta.toName}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && routes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-8">
            {/* Line dots display */}
            <div className="flex gap-2">
              {[
                { n: 5, color: "#996CAC" },
                { n: 3, color: "#EF7C1C" },
                { n: 2, color: "#00A84D" },
                { n: 9, color: "#BDB092" },
              ].map(({ n, color }) => (
                <div
                  key={n}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg"
                  style={{ backgroundColor: color }}
                >
                  {n}
                </div>
              ))}
            </div>

            <div className="text-center max-w-md">
              <p
                className="text-3xl sm:text-4xl font-black uppercase tracking-widest mb-3"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em" }}
              >
                출발역 · 도착역 입력
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#555" }}>
                실시간 열차 도착정보를 반영해 환승 대기시간을 최소화한 경로를 안내합니다
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                {[
                  ["상일동 → 대치", "5호선 → 3호선"],
                  ["김포공항 → 강남", "5·9호선 급행"],
                  ["여의도 → 잠실", "5·9·2호선"],
                  ["홍대입구 → 고속터미널", "2·3·9호선"],
                ].map(([route, hint]) => (
                  <div
                    key={route}
                    className="border px-3 py-2 text-left"
                    style={{ borderColor: "#1E1E1E" }}
                  >
                    <div className="font-bold" style={{ color: "#888" }}>{route}</div>
                    <div style={{ color: "#444" }}>{hint}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 border-t py-3 text-center" style={{ borderColor: "#1E1E1E" }}>
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: "#333", fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Data: 서울 열린데이터광장 실시간 도착정보 API · Seoul Open Data Plaza
        </p>
      </footer>
    </div>
  );
}
