import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTmdbMovieDetail, TmdbNotFoundError } from "@/lib/tmdb/client";
import {
  getCachedFilm,
  hasFullDetail,
  isStale,
  mapRowToFilmDetail,
  mapTmdbDetailToFilmDetail,
  upsertFilmDetail,
} from "@/lib/tmdb/cache";
import type { FilmDetail } from "@/lib/types";

export type FilmDetailResult =
  | { status: "ok"; film: FilmDetail }
  | { status: "not_found" }
  | { status: "unreachable" };

async function refreshInBackground(id: number) {
  try {
    const detail = await fetchTmdbMovieDetail(id);
    await upsertFilmDetail(createAdminClient(), detail);
  } catch {
    // Best-effort — a later request will retry the same stale path.
  }
}

/**
 * Shared by the /api/tmdb/film/[id] route and the film detail page, so
 * both get identical cache/freshness behaviour (§5, §9's "TMDB down"
 * rule) without duplicating the branching logic. Distinguishes "this
 * film genuinely doesn't exist" (TMDB 404) from "TMDB didn't respond" —
 * conflating the two would show a connectivity error for a bad id.
 */
export async function getFilmDetail(id: number): Promise<FilmDetailResult> {
  const cached = await getCachedFilm(id);

  if (cached) {
    if (!hasFullDetail(cached) || isStale(cached.synced_at)) {
      after(() => refreshInBackground(id));
    }
    return { status: "ok", film: mapRowToFilmDetail(cached) };
  }

  try {
    const detail = await fetchTmdbMovieDetail(id);
    await upsertFilmDetail(createAdminClient(), detail);
    return { status: "ok", film: mapTmdbDetailToFilmDetail(detail) };
  } catch (err) {
    if (err instanceof TmdbNotFoundError) return { status: "not_found" };
    return { status: "unreachable" };
  }
}
