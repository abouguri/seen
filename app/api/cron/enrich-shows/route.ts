import { NextResponse } from "next/server";
import { enrichShowBatch } from "@/lib/tmdb/show-enrichment";

// Mirrors app/api/cron/enrich-films/route.ts.
const CRON_BATCH_SIZE = 200;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
  }

  const result = await enrichShowBatch(CRON_BATCH_SIZE);
  return NextResponse.json(result);
}
