import { NextResponse } from "next/server";
import { enrichBatch } from "@/lib/tmdb/enrichment";

// Runs once daily (Vercel Hobby tier caps cron frequency at once/day —
// more frequent schedules need Pro), so this batch is large relative to
// the opportunistic per-request one; the opportunistic path in
// resolve-summaries.ts is the primary drain mechanism regardless of plan.
const CRON_BATCH_SIZE = 200;

/**
 * Scheduled drain of the director enrichment queue (fix 2) — see
 * vercel.json for the schedule. Vercel signs cron requests with
 * `Authorization: Bearer $CRON_SECRET` when that env var is set; this
 * rejects anything else so the route can't be triggered by a random
 * request and used to burn through the TMDB rate budget.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
  }

  const result = await enrichBatch(CRON_BATCH_SIZE);
  return NextResponse.json(result);
}
