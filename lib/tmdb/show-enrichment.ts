import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTmdbShowDetail } from "@/lib/tmdb/client";
import { upsertShowDetail } from "@/lib/tmdb/show-cache";

const DELAY_BETWEEN_REQUESTS_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mirrors enrichBatch (lib/tmdb/enrichment.ts) exactly — drains shows
 * that have never been through a full detail fetch (enriched_at IS
 * NULL), rate-limited, resumable by construction. Driven the same two
 * ways: a small opportunistic batch on real search/discover traffic, and
 * a scheduled batch via Vercel Cron (app/api/cron/enrich-shows).
 */
export async function enrichShowBatch(limit: number): Promise<{ processed: number; failed: number }> {
  const admin = createAdminClient();

  const { data: shows } = await admin
    .from("shows")
    .select("id")
    .is("enriched_at", null)
    .order("popularity", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!shows || shows.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const show of shows) {
    try {
      const detail = await fetchTmdbShowDetail(show.id);
      await upsertShowDetail(admin, detail);
      processed++;
    } catch {
      failed++;
    }
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  return { processed, failed };
}
