import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TmdbMovieDetail, TmdbSearchResult } from "@/lib/tmdb/raw-types";
import type { FilmDetail } from "@/lib/types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type FilmRow = {
  id: number;
  title: string;
  original_title: string | null;
  release_year: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime: number | null;
  overview: string | null;
  directors: string[];
  genres: string[];
  tmdb_rating: number | null;
  popularity: number | null;
  synced_at: string;
  enriched_at: string | null;
};

function extractYear(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function extractDirectors(detail: TmdbMovieDetail): string[] {
  return (detail.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name);
}

/**
 * §5: on any TMDB response, upsert into films and set synced_at.
 * `genres` comes pre-resolved from the caller (search/discover only give
 * genre_ids — see lib/tmdb/genres.ts) so a library built entirely from
 * the poster wall still has working genre filters without ever hitting
 * a film's detail page (fix 2). Only included in the upsert when
 * non-empty: if the genre-map lookup ever fails or a specific film
 * resolves to zero names, omitting the key preserves whatever's already
 * cached instead of overwriting good data (e.g. from a prior detail
 * fetch) with an empty array.
 */
export async function upsertFilmSummary(
  admin: SupabaseClient,
  movie: TmdbSearchResult,
  genres?: string[],
): Promise<void> {
  const payload: Record<string, unknown> = {
    id: movie.id,
    title: movie.title,
    original_title: movie.original_title ?? null,
    release_year: extractYear(movie.release_date),
    poster_path: movie.poster_path,
    overview: movie.overview ?? null,
    tmdb_rating: movie.vote_average ?? null,
    popularity: movie.popularity ?? null,
    synced_at: new Date().toISOString(),
  };
  if (genres && genres.length > 0) payload.genres = genres;

  await admin.from("films").upsert(payload);
}

export async function upsertFilmDetail(
  admin: SupabaseClient,
  detail: TmdbMovieDetail,
): Promise<void> {
  await admin.from("films").upsert({
    id: detail.id,
    title: detail.title,
    original_title: detail.original_title ?? null,
    release_year: extractYear(detail.release_date),
    poster_path: detail.poster_path,
    backdrop_path: detail.backdrop_path,
    runtime: detail.runtime ?? null,
    overview: detail.overview ?? null,
    directors: extractDirectors(detail),
    genres: (detail.genres ?? []).map((g) => g.name),
    tmdb_rating: detail.vote_average ?? null,
    popularity: detail.popularity ?? null,
    synced_at: new Date().toISOString(),
    enriched_at: new Date().toISOString(),
  });
}

export async function getCachedFilm(id: number): Promise<FilmRow | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("films").select("*").eq("id", id).maybeSingle();
  return data as FilmRow | null;
}

export function isStale(syncedAt: string): boolean {
  return Date.now() - new Date(syncedAt).getTime() > THIRTY_DAYS_MS;
}

/**
 * Whether a full detail fetch has ever completed for this film. Checks
 * enriched_at rather than runtime !== null — some films genuinely have no
 * runtime in TMDB (shorts, some documentaries), and treating that as "not
 * fully detailed" would refetch them forever without ever gaining anything.
 */
export function hasFullDetail(row: FilmRow): boolean {
  return row.enriched_at !== null;
}

export function mapRowToFilmDetail(row: FilmRow): FilmDetail {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title,
    year: row.release_year,
    runtime: row.runtime,
    overview: row.overview,
    posterPath: row.poster_path,
    backdropPath: row.backdrop_path,
    directors: row.directors,
    genres: row.genres,
    tmdbRating: row.tmdb_rating,
  };
}

export function mapTmdbDetailToFilmDetail(detail: TmdbMovieDetail): FilmDetail {
  return {
    id: detail.id,
    title: detail.title,
    originalTitle: detail.original_title ?? null,
    year: extractYear(detail.release_date),
    runtime: detail.runtime ?? null,
    overview: detail.overview ?? null,
    posterPath: detail.poster_path,
    backdropPath: detail.backdrop_path,
    directors: extractDirectors(detail),
    genres: (detail.genres ?? []).map((g) => g.name),
    tmdbRating: detail.vote_average ?? null,
  };
}
