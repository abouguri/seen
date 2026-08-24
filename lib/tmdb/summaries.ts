import "server-only";
import type { TmdbSearchResult } from "@/lib/tmdb/raw-types";
import type { SeenInfo } from "@/lib/seen";
import type { FilmSummary } from "@/lib/types";

/** Shared by search and discover — both return the same TMDB movie shape. */
export function toFilmSummary(
  movie: TmdbSearchResult,
  seen: SeenInfo | undefined,
  hasPosterWallEntry: boolean,
): FilmSummary {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
    posterPath: movie.poster_path,
    seen: Boolean(seen),
    lastWatchedOn: seen?.watchedOn ?? null,
    lastWatchedPrecision: seen?.precision ?? null,
    lastWatchedEraLabel: seen?.eraLabel ?? null,
    hasPosterWallEntry,
  };
}
