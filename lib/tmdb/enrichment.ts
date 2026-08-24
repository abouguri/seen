import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTmdbMovieDetail } from "@/lib/tmdb/client";
import { upsertFilmDetail } from "@/lib/tmdb/cache";

const DELAY_BETWEEN_REQUESTS_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Director enrichment queue (fix 2). Search/discover only ever give
 * genre_ids (resolved eagerly at cache time) — directors need a full
 * detail fetch, which is too expensive to do per-result on every search.
 * Instead this drains films that have never been through a full detail
 * fetch (runtime IS NULL — the same "hasFullDetail" signal from §5's
 * freshness logic), a few at a time, rate-limited by a small delay.
 *
 * Resumable by construction: each call just picks up whatever's left,
 * there's no separate progress table to get out of sync. Driven two
 * ways — a small opportunistic batch on real search/discover traffic
 * (never blocking, via `after()`), and a scheduled batch via Vercel Cron
 * (see app/api/cron/enrich-films) so the queue drains even with no
 * traffic at all.
 */
export async function enrichBatch(limit: number): Promise<{ processed: number; failed: number }> {
  const admin = createAdminClient();

  const { data: films } = await admin
    .from("films")
    .select("id")
    .is("runtime", null)
    .order("popularity", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!films || films.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const film of films) {
    try {
      const detail = await fetchTmdbMovieDetail(film.id);
      await upsertFilmDetail(admin, detail);
      processed++;
    } catch {
      // One film's failure (e.g. a transient TMDB error, or a since-
      // deleted TMDB id) shouldn't stop the rest of the batch — it just
      // stays in the queue and gets retried on the next drain.
      failed++;
    }
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  return { processed, failed };
}
