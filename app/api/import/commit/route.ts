import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";

const resolvedRowSchema = z.object({
  filmId: z.number().int().positive(),
  watchedOn: z.string().date().nullable(),
  precision: z.enum(["day", "month", "year", "era", "unknown"]),
  eraLabel: z.string().trim().max(200).nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
  note: z.string().trim().max(2000).nullable().optional(),
  place: z.string().trim().max(200).nullable().optional(),
  company: z.string().trim().max(200).nullable().optional(),
});

const bodySchema = z.object({
  rows: z.array(resolvedRowSchema).min(1).max(2000),
});

/**
 * Writes the user-confirmed import (§6.3: nothing is written until this
 * point). Re-import dedup (§9): skip a row if this user already has an
 * entry for the same (film_id, watched_on) — only meaningful for dated
 * rows, since two date-less entries for the same film can't be told
 * apart as "the same viewing" vs. two independently logged ones anyway.
 */
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
      { error: { code: "invalid_body", message: copy.errors.importFailed } },
      { status: 400 },
    );
  }

  const rows = parsed.data.rows;
  const filmIds = [...new Set(rows.map((r) => r.filmId))];

  const { data: existing, error: existingError } = await supabase
    .from("watch_entries")
    .select("film_id, watched_on")
    .in("film_id", filmIds)
    .not("watched_on", "is", null);

  if (existingError) {
    return NextResponse.json(
      { error: { code: "commit_failed", message: copy.errors.importFailed } },
      { status: 500 },
    );
  }

  const existingKeys = new Set((existing ?? []).map((e) => `${e.film_id}:${e.watched_on}`));

  const toInsert = rows.filter((row) => {
    if (!row.watchedOn) return true; // undated rows are never deduped
    return !existingKeys.has(`${row.filmId}:${row.watchedOn}`);
  });
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped });
  }

  const { error: insertError, count } = await supabase.from("watch_entries").insert(
    toInsert.map((row) => ({
      user_id: user.id,
      film_id: row.filmId,
      watched_on: row.watchedOn,
      precision: row.precision,
      era_label: row.eraLabel,
      rating: row.rating,
      note: row.note ?? null,
      place: row.place ?? null,
      company: row.company ?? null,
      source: "import" as const,
    })),
    { count: "exact" },
  );

  if (insertError) {
    return NextResponse.json(
      { error: { code: "commit_failed", message: copy.errors.importFailed } },
      { status: 500 },
    );
  }

  return NextResponse.json({ imported: count ?? toInsert.length, skipped });
}
