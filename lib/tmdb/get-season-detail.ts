import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTmdbSeasonDetail, TmdbNotFoundError } from "@/lib/tmdb/client";
import { isStale } from "@/lib/tmdb/cache";
import {
  getCachedSeasonWithEpisodes,
  mapRowsToSeasonDetail,
  mapTmdbToSeasonDetail,
  upsertSeasonWithEpisodes,
} from "@/lib/tmdb/episode-cache";
import type { SeasonDetail } from "@/lib/types";

export type SeasonDetailResult =
  | { status: "ok"; season: SeasonDetail }
  | { status: "not_found" }
  | { status: "unreachable" };

async function refreshInBackground(showId: number, seasonNumber: number) {
  try {
    const detail = await fetchTmdbSeasonDetail(showId, seasonNumber);
    await upsertSeasonWithEpisodes(createAdminClient(), showId, detail);
  } catch {
    // Best-effort — a later request will retry the same stale path.
  }
}

/**
 * Cache-or-fetch orchestration for one season's episode list, mirroring
 * get-show-detail.ts but keyed by (showId, seasonNumber). No hasFullDetail
 * check: unlike a film/show summary-then-detail split, a cached season row
 * from upsertSeasonWithEpisodes is always fully populated — there's no
 * partial season state to distinguish.
 */
export async function getSeasonDetail(
  showId: number,
  seasonNumber: number,
): Promise<SeasonDetailResult> {
  const cached = await getCachedSeasonWithEpisodes(showId, seasonNumber);

  if (cached && cached.episodes.length > 0) {
    if (isStale(cached.season.synced_at)) after(() => refreshInBackground(showId, seasonNumber));
    return { status: "ok", season: mapRowsToSeasonDetail(cached) };
  }

  try {
    const detail = await fetchTmdbSeasonDetail(showId, seasonNumber);
    await upsertSeasonWithEpisodes(createAdminClient(), showId, detail);
    return { status: "ok", season: mapTmdbToSeasonDetail(showId, detail) };
  } catch (err) {
    if (err instanceof TmdbNotFoundError) return { status: "not_found" };
    return { status: "unreachable" };
  }
}
