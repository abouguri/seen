import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TmdbTvDetail, TmdbTvSearchResult } from "@/lib/tmdb/raw-types";
import type { CastMember, ShowDetail } from "@/lib/types";

export type ShowRow = {
  id: number;
  name: string;
  original_name: string | null;
  first_air_year: number | null;
  last_air_year: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  creators: string[];
  cast_members: CastMember[];
  genres: string[];
  tmdb_rating: number | null;
  popularity: number | null;
  number_of_seasons: number | null;
  number_of_episodes: number | null;
  status: string | null;
  synced_at: string;
  enriched_at: string | null;
};

function extractYear(date: string | null | undefined): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function extractCreators(detail: TmdbTvDetail): string[] {
  return (detail.created_by ?? []).map((c) => c.name);
}

/** Top 10 billed — same shape/limit as lib/tmdb/cache.ts's extractCast. */
function extractCast(detail: TmdbTvDetail): CastMember[] {
  return (detail.credits?.cast ?? [])
    .slice(0, 10)
    .map((c) => ({ id: c.id, name: c.name, profilePath: c.profile_path ?? null }));
}

/**
 * Mirrors upsertFilmSummary — same "omit genres unless non-empty" rule,
 * so a resolved genre never clobbers real data from a prior detail fetch.
 */
export async function upsertShowSummary(
  admin: SupabaseClient,
  show: TmdbTvSearchResult,
  genres?: string[],
): Promise<void> {
  const payload: Record<string, unknown> = {
    id: show.id,
    name: show.name,
    original_name: show.original_name ?? null,
    first_air_year: extractYear(show.first_air_date),
    poster_path: show.poster_path,
    overview: show.overview ?? null,
    tmdb_rating: show.vote_average ?? null,
    popularity: show.popularity ?? null,
    synced_at: new Date().toISOString(),
  };
  if (genres && genres.length > 0) payload.genres = genres;

  await admin.from("shows").upsert(payload);
}

export async function upsertShowDetail(
  admin: SupabaseClient,
  detail: TmdbTvDetail,
): Promise<void> {
  await admin.from("shows").upsert({
    id: detail.id,
    name: detail.name,
    original_name: detail.original_name ?? null,
    first_air_year: extractYear(detail.first_air_date),
    last_air_year: extractYear(detail.last_air_date),
    poster_path: detail.poster_path,
    backdrop_path: detail.backdrop_path,
    overview: detail.overview ?? null,
    creators: extractCreators(detail),
    cast_members: extractCast(detail),
    genres: (detail.genres ?? []).map((g) => g.name),
    tmdb_rating: detail.vote_average ?? null,
    popularity: detail.popularity ?? null,
    number_of_seasons: detail.number_of_seasons ?? null,
    number_of_episodes: detail.number_of_episodes ?? null,
    status: detail.status ?? null,
    synced_at: new Date().toISOString(),
    enriched_at: new Date().toISOString(),
  });
}

export async function getCachedShow(id: number): Promise<ShowRow | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("shows").select("*").eq("id", id).maybeSingle();
  return data as ShowRow | null;
}

export function mapRowToShowDetail(row: ShowRow): ShowDetail {
  return {
    id: row.id,
    title: row.name,
    originalTitle: row.original_name,
    year: row.first_air_year,
    overview: row.overview,
    posterPath: row.poster_path,
    backdropPath: row.backdrop_path,
    creators: row.creators,
    castMembers: row.cast_members,
    genres: row.genres,
    tmdbRating: row.tmdb_rating,
    numberOfSeasons: row.number_of_seasons,
    numberOfEpisodes: row.number_of_episodes,
    status: row.status,
  };
}

export function mapTmdbDetailToShowDetail(detail: TmdbTvDetail): ShowDetail {
  return {
    id: detail.id,
    title: detail.name,
    originalTitle: detail.original_name ?? null,
    year: extractYear(detail.first_air_date),
    overview: detail.overview ?? null,
    posterPath: detail.poster_path,
    backdropPath: detail.backdrop_path,
    creators: extractCreators(detail),
    castMembers: extractCast(detail),
    genres: (detail.genres ?? []).map((g) => g.name),
    tmdbRating: detail.vote_average ?? null,
    numberOfSeasons: detail.number_of_seasons ?? null,
    numberOfEpisodes: detail.number_of_episodes ?? null,
    status: detail.status ?? null,
  };
}
