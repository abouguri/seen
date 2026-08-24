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
};

function extractYear(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function extractDirectors(detail: TmdbMovieDetail): string[] {
  return (detail.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name);
}

/** §5: on any TMDB response, upsert into films and set synced_at. */
export async function upsertFilmSummary(
  admin: SupabaseClient,
  movie: TmdbSearchResult,
): Promise<void> {
  await admin.from("films").upsert({
    id: movie.id,
    title: movie.title,
    original_title: movie.original_title ?? null,
    release_year: extractYear(movie.release_date),
    poster_path: movie.poster_path,
    overview: movie.overview ?? null,
    tmdb_rating: movie.vote_average ?? null,
    popularity: movie.popularity ?? null,
    synced_at: new Date().toISOString(),
  });
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

/** Search never populates runtime — only a full detail fetch does. */
export function hasFullDetail(row: FilmRow): boolean {
  return row.runtime !== null;
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
