import { NextResponse } from "next/server";
import { getQueueMetrics } from "@/lib/job-queue";

export const runtime = "nodejs";

export async function GET() {
  try {
    const metrics = await getQueueMetrics();
    return NextResponse.json({
      queue: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "queue_metrics_failed", detail: String(err) },
      { status: 500 }
    );
  }
}
