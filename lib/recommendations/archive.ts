import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Archive, ArchiveFilm } from "@/lib/recommendations/types";

/**
 * Reads everything the recommender knows about one user in two queries.
 *
 * Both go through the request-scoped client rather than the admin one,
 * so RLS does the ownership check — user_films is a security_invoker
 * view, which means selecting from it can only ever return the calling
 * user's own rows. There is no user_id filter here for that reason, and
 * adding one would imply the isolation lives in this file when it
 * doesn't.
 *
 * This is the part that is deliberately *not* cached. The brief asks for
 * recommendations that recompute when the library changes rather than on
 * a timer, and the cheapest way to get exactly that is to re-read the
 * library on every render and cache the expensive half — the TMDB
 * lookups, which are user-independent — underneath it. Logging a film
 * changes the homepage on the next navigation, with no cache
 * invalidation to get wrong.
 */
export async function loadArchive(): Promise<Archive | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [filmsResult, dismissedResult] = await Promise.all([
    supabase
      .from("user_films")
      .select(
        "id, title, release_year, poster_path, directors, genres, cast_members, collection_id, collection_name, rating, last_watched_on",
      ),
    supabase.from("dismissed_recommendations").select("film_id"),
  ]);

  const films: ArchiveFilm[] = (filmsResult.data ?? []).map((row) => ({
    id: Number(row.id),
    title: row.title as string,
    year: row.release_year as number | null,
    posterPath: row.poster_path as string | null,
    directors: (row.directors as string[] | null) ?? [],
    genres: (row.genres as string[] | null) ?? [],
    castMembers: (row.cast_members as ArchiveFilm["castMembers"] | null) ?? [],
    collectionId: row.collection_id as number | null,
    collectionName: row.collection_name as string | null,
    rating: row.rating as number | null,
    lastWatchedOn: row.last_watched_on as string | null,
  }));

  return {
    films,
    loggedIds: new Set(films.map((film) => film.id)),
    dismissedIds: new Set(
      (dismissedResult.data ?? []).map((row) => Number(row.film_id)),
    ),
  };
}
