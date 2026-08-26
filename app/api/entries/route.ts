import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import { setEntryTags, getEntryTags } from "@/lib/tags/resolve";
import type { WatchEntry } from "@/lib/types";

const getQuerySchema = z.object({ filmId: z.coerce.number().int().positive() });

/**
 * Lists one film's viewing history — the film detail page already does
 * this as a direct server-side query; this is the same query exposed as
 * JSON, for the library's detail modal (components/library/DetailModal.tsx),
 * which fetches client-side instead of rendering a full page.
 */
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
  const parsed = getQuerySchema.safeParse({ filmId: searchParams.get("filmId") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_query", message: copy.errors.libraryLoadFailed } },
      { status: 400 },
    );
  }

  const { data: entryRows, error } = await supabase
    .from("watch_entries")
    .select("id, film_id, watched_on, precision, era_label, rating, note, place, company, created_at")
    .eq("film_id", parsed.data.filmId)
    .order("watched_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
      { status: 500 },
    );
  }

  const tagsByEntry = await getEntryTags(
    supabase,
    (entryRows ?? []).map((row) => row.id),
  );

  const entries: WatchEntry[] = (entryRows ?? []).map((row) => ({
    id: row.id,
    filmId: row.film_id,
    watchedOn: row.watched_on,
    precision: row.precision,
    eraLabel: row.era_label,
    rating: row.rating,
    note: row.note,
    place: row.place,
    company: row.company,
    createdAt: row.created_at,
    tags: tagsByEntry.get(row.id) ?? [],
  }));

  return NextResponse.json(entries);
}

const bodySchema = z.object({
  filmId: z.number().int().positive(),
  watchedOn: z.string().date().nullable(),
  precision: z.enum(["day", "month", "year", "era", "unknown"]),
  eraLabel: z.string().trim().max(200).nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
  note: z.string().trim().max(2000).nullable(),
  place: z.string().trim().max(200).nullable(),
  company: z.string().trim().max(200).nullable(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

// Poster wall (§6.2): era_label is always the 4-digit year that was
// active when the tile was tapped.
const bulkBodySchema = z.object({
  add: z.array(
    z.object({
      filmId: z.number().int().positive(),
      eraLabel: z.string().regex(/^\d{4}$/),
    }),
  ),
  remove: z.array(z.number().int().positive()),
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

  const { searchParams } = new URL(request.url);
  if (searchParams.get("bulk") === "1") {
    return handleBulk(request, supabase, user);
  }
  return handleSingle(request, supabase, user);
}

async function handleSingle(request: Request, supabase: SupabaseClient, user: User) {
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

  let tags: string[] = [];
  if (input.tags.length > 0) {
    try {
      tags = await setEntryTags(supabase, data.id, user.id, input.tags);
    } catch {
      // The entry itself saved fine — tags are a lesser failure, not
      // worth discarding the viewing over. Surfaced as an empty tag list;
      // the user can re-add them from the entry.
    }
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
    tags,
  };

  return NextResponse.json(entry, { status: 201 });
}

async function handleBulk(request: Request, supabase: SupabaseClient, user: User) {
  const json = await request.json().catch(() => null);
  const parsed = bulkBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: copy.errors.entrySaveFailed } },
      { status: 400 },
    );
  }

  const { add, remove } = parsed.data;
  let added = 0;
  let removed = 0;

  if (add.length > 0) {
    const filmIds = add.map((a) => a.filmId);
    // Idempotency (§6.2: re-visiting a year must not duplicate entries):
    // filter out films that already have a poster_wall row for this user
    // before inserting. The partial unique index is the backstop for the
    // race window between this check and the insert below.
    const { data: existing } = await supabase
      .from("watch_entries")
      .select("film_id")
      .eq("user_id", user.id)
      .eq("source", "poster_wall")
      .in("film_id", filmIds);

    const existingIds = new Set((existing ?? []).map((row) => row.film_id));
    const toInsert = add.filter((a) => !existingIds.has(a.filmId));

    if (toInsert.length > 0) {
      const rows = toInsert.map(({ filmId, eraLabel }) => ({
        user_id: user.id,
        film_id: filmId,
        watched_on: null,
        precision: "era" as const,
        era_label: eraLabel,
        source: "poster_wall" as const,
      }));
      const { error, count } = await supabase
        .from("watch_entries")
        .insert(rows, { count: "exact" });
      if (!error) added = count ?? toInsert.length;
    }
  }

  if (remove.length > 0) {
    const { data, error } = await supabase
      .from("watch_entries")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "poster_wall")
      .in("film_id", remove)
      .select("id");
    if (!error) removed = (data ?? []).length;
  }

  return NextResponse.json({ added, removed });
}
