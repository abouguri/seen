import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TmdbSeasonDetail, TmdbSeasonSummary } from "@/lib/tmdb/raw-types";
import type { SeasonDetail } from "@/lib/types";

export type SeasonRow = {
  id: number;
  show_id: number;
  season_number: number;
  name: string | null;
  overview: string | null;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number | null;
  synced_at: string;
};

export type EpisodeRow = {
  id: number;
  season_id: number;
  show_id: number;
  season_number: number;
  episode_number: number;
  name: string | null;
  overview: string | null;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  synced_at: string;
};

/**
 * Bulk upsert from a show detail response's native seasons[] — no
 * episodes touched. Called from get-show-detail.ts alongside
 * upsertShowDetail, so a season row exists (with its episode_count
 * denominator) as soon as a show's detail is fetched, without ever
 * fetching an episode list.
 */
export async function upsertSeasonSummaries(
  admin: SupabaseClient,
  showId: number,
  seasons: TmdbSeasonSummary[],
): Promise<void> {
  if (seasons.length === 0) return;

  const rows = seasons.map((season) => ({
    id: season.id,
    show_id: showId,
    season_number: season.season_number,
    name: season.name,
    poster_path: season.poster_path,
    air_date: season.air_date ?? null,
    episode_count: season.episode_count,
    synced_at: new Date().toISOString(),
  }));

  await admin.from("seasons").upsert(rows);
}

/**
 * Upserts the one seasons row (full fidelity: overview, air_date) plus
 * bulk-upserts its episodes. Kept as one function rather than a
 * summary/detail split — a season is always ingested whole from one
 * /season/{n} response, there's no partial season state to represent.
 */
export async function upsertSeasonWithEpisodes(
  admin: SupabaseClient,
  showId: number,
  detail: TmdbSeasonDetail,
): Promise<void> {
  const syncedAt = new Date().toISOString();

  await admin.from("seasons").upsert({
    id: detail.id,
    show_id: showId,
    season_number: detail.season_number,
    name: detail.name ?? null,
    overview: detail.overview ?? null,
    poster_path: detail.poster_path ?? null,
    air_date: detail.air_date ?? null,
    episode_count: detail.episodes.length,
    synced_at: syncedAt,
  });

  if (detail.episodes.length === 0) return;

  const episodeRows = detail.episodes.map((episode) => ({
    id: episode.id,
    season_id: detail.id,
    show_id: showId,
    season_number: episode.season_number,
    episode_number: episode.episode_number,
    name: episode.name,
    overview: episode.overview ?? null,
    air_date: episode.air_date ?? null,
    still_path: episode.still_path ?? null,
    runtime: episode.runtime ?? null,
    synced_at: syncedAt,
  }));

  await admin.from("episodes").upsert(episodeRows);
}

/**
 * Cheap existence check so get-show-detail.ts can tell "this show was
 * cached before episode tracking shipped, it has no season rows yet"
 * apart from the general 30-day isStale check — without this, an
 * already-cached show wouldn't get its seasons backfilled until its next
 * routine staleness refresh, up to a month away.
 */
export async function hasSeasonRows(showId: number): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("seasons").select("id").eq("show_id", showId).limit(1);
  return (data?.length ?? 0) > 0;
}

export async function getCachedSeasonWithEpisodes(
  showId: number,
  seasonNumber: number,
): Promise<{ season: SeasonRow; episodes: EpisodeRow[] } | null> {
  const admin = createAdminClient();

  const { data: season } = await admin
    .from("seasons")
    .select("*")
    .eq("show_id", showId)
    .eq("season_number", seasonNumber)
    .maybeSingle();

  if (!season) return null;

  const { data: episodes } = await admin
    .from("episodes")
    .select("*")
    .eq("season_id", season.id)
    .order("episode_number", { ascending: true });

  return { season: season as SeasonRow, episodes: (episodes ?? []) as EpisodeRow[] };
}

function mapEpisodeRow(row: EpisodeRow): SeasonDetail["episodes"][number] {
  return {
    id: row.id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    name: row.name ?? "",
    overview: row.overview,
    airDate: row.air_date,
    stillPath: row.still_path,
    runtimeMinutes: row.runtime,
  };
}

export function mapRowsToSeasonDetail(cached: {
  season: SeasonRow;
  episodes: EpisodeRow[];
}): SeasonDetail {
  const { season, episodes } = cached;
  return {
    id: season.id,
    showId: season.show_id,
    seasonNumber: season.season_number,
    name: season.name,
    overview: season.overview,
    airDate: season.air_date,
    posterPath: season.poster_path,
    episodeCount: season.episode_count ?? episodes.length,
    episodes: episodes.map(mapEpisodeRow),
  };
}

export function mapTmdbToSeasonDetail(showId: number, detail: TmdbSeasonDetail): SeasonDetail {
  return {
    id: detail.id,
    showId,
    seasonNumber: detail.season_number,
    name: detail.name ?? null,
    overview: detail.overview ?? null,
    airDate: detail.air_date ?? null,
    posterPath: detail.poster_path ?? null,
    episodeCount: detail.episodes.length,
    episodes: detail.episodes.map((episode) => ({
      id: episode.id,
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      name: episode.name,
      overview: episode.overview ?? null,
      airDate: episode.air_date ?? null,
      stillPath: episode.still_path ?? null,
      runtimeMinutes: episode.runtime ?? null,
    })),
  };
}
