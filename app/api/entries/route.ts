import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import type { WatchEntry } from "@/lib/types";

const bodySchema = z.object({
  filmId: z.number().int().positive(),
  watchedOn: z.string().date().nullable(),
  precision: z.enum(["day", "month", "year", "era", "unknown"]),
  eraLabel: z.string().trim().max(200).nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
  note: z.string().trim().max(2000).nullable(),
  place: z.string().trim().max(200).nullable(),
  company: z.string().trim().max(200).nullable(),
});

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
    .from("watch_entries")
    .insert({
      user_id: user.id,
      film_id: input.filmId,
      watched_on: input.watchedOn,
      precision: input.precision,
      era_label: input.eraLabel,
      rating: input.rating,
      note: input.note,
      place: input.place,
      company: input.company,
      source: "manual",
    })
    .select("id, film_id, watched_on, precision, era_label, rating, note, place, company, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: "insert_failed", message: copy.errors.entrySaveFailed } },
      { status: 500 },
    );
  }

  const entry: WatchEntry = {
    id: data.id,
    filmId: data.film_id,
    watchedOn: data.watched_on,
    precision: data.precision,
    eraLabel: data.era_label,
    rating: data.rating,
    note: data.note,
    place: data.place,
    company: data.company,
    createdAt: data.created_at,
  };

  return NextResponse.json(entry, { status: 201 });
}
