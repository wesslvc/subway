import { NextRequest, NextResponse } from "next/server";
import { fetchRealtimeArrivalsServer } from "@/lib/api-client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station");

  if (!station) {
    return NextResponse.json(
      { error: "Missing station parameter" },
      { status: 400 }
    );
  }

  try {
    const arrivals = await fetchRealtimeArrivalsServer(station);
    return NextResponse.json({
      arrivals,
      station,
      timestamp: new Date().toISOString(),
      isDemo: !process.env.NEXT_PUBLIC_SEOUL_API_KEY && !process.env.SEOUL_API_KEY,
    });
  } catch (error) {
    console.error("Arrivals API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch arrivals", arrivals: [] },
      { status: 500 }
    );
  }
}
