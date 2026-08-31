import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import type { EpisodeWatchEntry } from "@/lib/types";

/** Mirrors app/api/show-entries/[id]/route.ts — no tags. PATCH is the
 *  secondary "attach a rating/note/date to this episode" flow; DELETE is
 *  how the checklist un-marks an episode as seen. */
const patchBodySchema = z.object({
  watchedOn: z.string().date().nullable(),
  precision: z.enum(["day", "month", "year", "era", "unknown"]),
  eraLabel: z.string().trim().max(200).nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
  note: z.string().trim().max(2000).nullable(),
  place: z.string().trim().max(200).nullable(),
  company: z.string().trim().max(200).nullable(),
});

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: copy.errors.entrySaveFailed } },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data, error } = await supabase
    .from("episode_watch_entries")
    .update({
      watched_on: input.watchedOn,
      precision: input.precision,
      era_label: input.eraLabel,
      rating: input.rating,
      note: input.note,
      place: input.place,
      company: input.company,
    })
    .eq("id", id)
    .select(
      "id, show_id, season_number, episode_id, watched_on, precision, era_label, rating, note, place, company, created_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: "not_found", message: copy.errors.entrySaveFailed } },
      { status: 404 },
    );
  }

  return NextResponse.json(mapRow(data));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data, error } = await supabase
    .from("episode_watch_entries")
    .delete()
    .eq("id", id)
    .select("id");

  if (error || !data || data.length === 0) {
    return NextResponse.json(
      { error: { code: "not_found", message: copy.errors.entrySaveFailed } },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
