import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertFilmSummary } from "@/lib/tmdb/cache";
import { toFilmSummary } from "@/lib/tmdb/summaries";
import { buildSeenMap } from "@/lib/seen";
import type { TmdbSearchResult } from "@/lib/tmdb/raw-types";
import type { FilmSummary } from "@/lib/types";

/**
 * Shared by search and discover: cache-upsert every TMDB result (§5),
 * then resolve each one's seen status against the caller's own
 * watch_entries (RLS-scoped via the passed-in user client).
 */
export async function resolveFilmSummaries(
  supabase: SupabaseClient,
  movies: TmdbSearchResult[],
): Promise<FilmSummary[]> {
  const admin = createAdminClient();
  await Promise.all(movies.map((movie) => upsertFilmSummary(admin, movie)));

  const filmIds = movies.map((movie) => movie.id);
  const { data: entries } = await supabase
    .from("watch_entries")
    .select("film_id, watched_on, precision, era_label, created_at")
    .in("film_id", filmIds.length ? filmIds : [-1]);

  const seenMap = buildSeenMap(entries ?? []);

  return movies.map((movie) => toFilmSummary(movie, seenMap.get(movie.id)));
}
