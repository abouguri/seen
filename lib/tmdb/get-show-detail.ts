import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTmdbShowDetail, TmdbNotFoundError } from "@/lib/tmdb/client";
import { isStale, hasFullDetail } from "@/lib/tmdb/cache";
import {
  getCachedShow,
  mapRowToShowDetail,
  mapTmdbDetailToShowDetail,
  upsertShowDetail,
} from "@/lib/tmdb/show-cache";
import type { ShowDetail } from "@/lib/types";

export type ShowDetailResult =
  | { status: "ok"; show: ShowDetail }
  | { status: "not_found" }
  | { status: "unreachable" };

async function refreshInBackground(id: number) {
  try {
    const detail = await fetchTmdbShowDetail(id);
    await upsertShowDetail(createAdminClient(), detail);
  } catch {
    // Best-effort — a later request will retry the same stale path.
  }
}

/**
 * Mirrors getFilmDetail exactly — same cache/freshness/stale-while-
 * revalidate behaviour, same 3-way not_found/unreachable distinction.
 * isStale/hasFullDetail are reused as-is from lib/tmdb/cache.ts: both
 * are already generic over {synced_at}/{enriched_at}, nothing film-
 * specific about them.
 */
export async function getShowDetail(id: number): Promise<ShowDetailResult> {
  const cached = await getCachedShow(id);

  if (cached) {
    if (!hasFullDetail(cached) || isStale(cached.synced_at)) {
      after(() => refreshInBackground(id));
    }
    return { status: "ok", show: mapRowToShowDetail(cached) };
  }

  try {
    const detail = await fetchTmdbShowDetail(id);
    await upsertShowDetail(createAdminClient(), detail);
    return { status: "ok", show: mapTmdbDetailToShowDetail(detail) };
  } catch (err) {
    if (err instanceof TmdbNotFoundError) return { status: "not_found" };
    return { status: "unreachable" };
  }
}
