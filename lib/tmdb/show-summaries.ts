import "server-only";
import type { TmdbTvSearchResult } from "@/lib/tmdb/raw-types";
import type { SeenInfo } from "@/lib/seen";
import type { ShowSummary } from "@/lib/types";

/** Mirrors toFilmSummary — field-aligned to FilmSummary's shape. */
export function toShowSummary(
  show: TmdbTvSearchResult,
  seen: SeenInfo | undefined,
  hasPosterWallEntry: boolean,
): ShowSummary {
  return {
    id: show.id,
    title: show.name,
    year: show.first_air_date ? Number(show.first_air_date.slice(0, 4)) || null : null,
    posterPath: show.poster_path,
    seen: Boolean(seen),
    lastWatchedOn: seen?.watchedOn ?? null,
    lastWatchedPrecision: seen?.precision ?? null,
    lastWatchedEraLabel: seen?.eraLabel ?? null,
    hasPosterWallEntry,
  };
}
