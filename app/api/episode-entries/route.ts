import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import type { EpisodeWatchEntry } from "@/lib/types";

/**
 * Mirrors app/api/show-entries/route.ts's GET + single-insert POST —
 * episodeId/seasonNumber instead of just showId, no tags. No bulk mode:
 * episodes have no poster-wall entry point (see components/show/
 * SeasonChecklist.tsx's doc comment), so there's nothing to batch-flush —
 * this is scope reduction, not a shortcut.
 */
const bodySchema = z.object({
  episodeId: z.number().int().positive(),
  showId: z.number().int().positive(),
  seasonNumber: z.number().int().min(0),
});

const getQuerySchema = z.object({ showId: z.coerce.number().int().positive() });

function mapRow(data: {
  id: string;
  show_id: number;
  season_number: number;
  episode_id: number;
  watched_on: string | null;
  precision: string;
  era_label: string | null;
  rating: number | null;
  note: string | null;
  place: string | null;
  company: string | null;
  created_at: string;
}): EpisodeWatchEntry {
  return {
    id: data.id,
    showId: data.show_id,
    seasonNumber: data.season_number,
    episodeId: data.episode_id,
    watchedOn: data.watched_on,
    precision: data.precision as EpisodeWatchEntry["precision"],
    eraLabel: data.era_label,
    rating: data.rating,
    note: data.note,
    place: data.place,
    company: data.company,
    createdAt: data.created_at,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: copy.errors.signInRequired } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = getQuerySchema.safeParse({ showId: searchParams.get("showId") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_query", message: copy.errors.libraryLoadFailed } },
      { status: 400 },
    );
  }

  const { data: entryRows, error } = await supabase
    .from("episode_watch_entries")
    .select(
      "id, show_id, season_number, episode_id, watched_on, precision, era_label, rating, note, place, company, created_at",
    )
    .eq("show_id", parsed.data.showId)
    .order("watched_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
      { status: 500 },
    );
  }

  return NextResponse.json((entryRows ?? []).map(mapRow));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: copy.errors.signInRequired } },
      { status: 401 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: copy.errors.entrySaveFailed } },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data, error } = await supabase
    .from("episode_watch_entries")
    .insert({
      user_id: user.id,
      show_id: input.showId,
      season_number: input.seasonNumber,
      episode_id: input.episodeId,
      watched_on: null,
      precision: "unknown",
      source: "manual",
    })
    .select(
      "id, show_id, season_number, episode_id, watched_on, precision, era_label, rating, note, place, company, created_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: "insert_failed", message: copy.errors.entrySaveFailed } },
      { status: 500 },
    );
  }

  return NextResponse.json(mapRow(data), { status: 201 });
}
