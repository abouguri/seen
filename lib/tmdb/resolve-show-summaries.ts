import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertShowSummary } from "@/lib/tmdb/show-cache";
import { toShowSummary } from "@/lib/tmdb/show-summaries";
import { getTvGenreMap, mapGenreIds } from "@/lib/tmdb/genres";
import { enrichShowBatch } from "@/lib/tmdb/show-enrichment";
import { buildShowSeenMap, buildShowPosterWallSet } from "@/lib/seen";
import type { TmdbTvSearchResult } from "@/lib/tmdb/raw-types";
import type { ShowSummary } from "@/lib/types";

/**
 * Mirrors resolveFilmSummaries: cache-upsert every TMDB result, resolve
 * TV genres (a different id vocabulary from movies, see getTvGenreMap),
 * kick off opportunistic enrichment, then resolve seen status against
 * the caller's own show_watch_entries (RLS-scoped).
 */
export async function resolveShowSummaries(
  supabase: SupabaseClient,
  shows: TmdbTvSearchResult[],
): Promise<ShowSummary[]> {
  const admin = createAdminClient();
  const genreMap = await getTvGenreMap();
  await Promise.all(
    shows.map((show) => upsertShowSummary(admin, show, mapGenreIds(show.genre_ids, genreMap))),
  );

  after(() => enrichShowBatch(5));

  const showIds = shows.map((show) => show.id);
  const { data: entries } = await supabase
    .from("show_watch_entries")
    .select("show_id, watched_on, precision, era_label, created_at, source")
    .in("show_id", showIds.length ? showIds : [-1]);

  const seenMap = buildShowSeenMap(entries ?? []);
  const posterWallSet = buildShowPosterWallSet(entries ?? []);

  return shows.map((show) =>
    toShowSummary(show, seenMap.get(show.id), posterWallSet.has(show.id)),
  );
}
