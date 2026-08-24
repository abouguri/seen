import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertFilmSummary } from "@/lib/tmdb/cache";
import { toFilmSummary } from "@/lib/tmdb/summaries";
import { getGenreMap, mapGenreIds } from "@/lib/tmdb/genres";
import { enrichBatch } from "@/lib/tmdb/enrichment";
import { buildSeenMap, buildPosterWallSet } from "@/lib/seen";
import type { TmdbSearchResult } from "@/lib/tmdb/raw-types";
import type { FilmSummary } from "@/lib/types";

/**
 * Shared by search and discover: cache-upsert every TMDB result (§5),
 * resolving genres from genre_ids via the shared genre-name lookup
 * (fix 2) so genre filters work without ever fetching a film's detail
 * page, then resolve each one's seen status against the caller's own
 * watch_entries (RLS-scoped via the passed-in user client).
 */
export async function resolveFilmSummaries(
  supabase: SupabaseClient,
  movies: TmdbSearchResult[],
): Promise<FilmSummary[]> {
  const admin = createAdminClient();
  const genreMap = await getGenreMap();
  await Promise.all(
    movies.map((movie) => upsertFilmSummary(admin, movie, mapGenreIds(movie.genre_ids, genreMap))),
  );

  // Opportunistic director enrichment (fix 2): a small batch piggybacks
  // on real traffic so the queue drains between cron runs too, and never
  // blocks this response.
  after(() => enrichBatch(5));

  const filmIds = movies.map((movie) => movie.id);
  const { data: entries } = await supabase
    .from("watch_entries")
    .select("film_id, watched_on, precision, era_label, created_at, source")
    .in("film_id", filmIds.length ? filmIds : [-1]);

  const seenMap = buildSeenMap(entries ?? []);
  const posterWallSet = buildPosterWallSet(entries ?? []);

  return movies.map((movie) =>
    toFilmSummary(movie, seenMap.get(movie.id), posterWallSet.has(movie.id)),
  );
}
