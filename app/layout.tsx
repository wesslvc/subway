import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "METRO FINDER — 서울 실시간 지하철 경로",
  description: "실시간 열차 도착정보를 반영한 환승 최적화 서울 지하철 경로 탐색",
  keywords: "서울 지하철, 지하철 경로, 환승, 실시간 도착정보",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,700&family=Barlow:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
