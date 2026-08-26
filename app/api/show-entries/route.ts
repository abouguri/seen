import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import type { ShowWatchEntry } from "@/lib/types";

/** Mirrors app/api/entries/route.ts exactly — showId instead of filmId,
 *  no tags (show tagging is out of scope for now). */
const bodySchema = z.object({
  showId: z.number().int().positive(),
  watchedOn: z.string().date().nullable(),
  precision: z.enum(["day", "month", "year", "era", "unknown"]),
  eraLabel: z.string().trim().max(200).nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
  note: z.string().trim().max(2000).nullable(),
  place: z.string().trim().max(200).nullable(),
  company: z.string().trim().max(200).nullable(),
});

// Poster wall: era_label is always the 4-digit year active when the tile
// was tapped — same convention as the film bulk route.
const bulkBodySchema = z.object({
  add: z.array(
    z.object({
      showId: z.number().int().positive(),
      eraLabel: z.string().regex(/^\d{4}$/),
    }),
  ),
  remove: z.array(z.number().int().positive()),
});

const getQuerySchema = z.object({ showId: z.coerce.number().int().positive() });

/** Mirrors GET in app/api/entries/route.ts — no tags. */
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
    .from("show_watch_entries")
    .select("id, show_id, watched_on, precision, era_label, rating, note, place, company, created_at")
    .eq("show_id", parsed.data.showId)
    .order("watched_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
      { status: 500 },
    );
  }

  const entries: ShowWatchEntry[] = (entryRows ?? []).map((row) => ({
    id: row.id,
    showId: row.show_id,
    watchedOn: row.watched_on,
    precision: row.precision,
    eraLabel: row.era_label,
    rating: row.rating,
    note: row.note,
    place: row.place,
    company: row.company,
    createdAt: row.created_at,
  }));

  return NextResponse.json(entries);
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
    .from("show_watch_entries")
    .insert({
      user_id: user.id,
      show_id: input.showId,
      watched_on: input.watchedOn,
      precision: input.precision,
      era_label: input.eraLabel,
      rating: input.rating,
      note: input.note,
      place: input.place,
      company: input.company,
      source: "manual",
    })
    .select("id, show_id, watched_on, precision, era_label, rating, note, place, company, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: "insert_failed", message: copy.errors.entrySaveFailed } },
      { status: 500 },
    );
  }

  const entry: ShowWatchEntry = {
    id: data.id,
    showId: data.show_id,
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
    const showIds = add.map((a) => a.showId);
    // Idempotency: filter out shows that already have a poster_wall row
    // for this user before inserting. The partial unique index is the
    // backstop for the race window between this check and the insert.
    const { data: existing } = await supabase
      .from("show_watch_entries")
      .select("show_id")
      .eq("user_id", user.id)
      .eq("source", "poster_wall")
      .in("show_id", showIds);

    const existingIds = new Set((existing ?? []).map((row) => row.show_id));
    const toInsert = add.filter((a) => !existingIds.has(a.showId));

    if (toInsert.length > 0) {
      const rows = toInsert.map(({ showId, eraLabel }) => ({
        user_id: user.id,
        show_id: showId,
        watched_on: null,
        precision: "era" as const,
        era_label: eraLabel,
        source: "poster_wall" as const,
      }));
      const { error, count } = await supabase
        .from("show_watch_entries")
        .insert(rows, { count: "exact" });
      if (!error) added = count ?? toInsert.length;
    }
  }

  if (remove.length > 0) {
    const { data, error } = await supabase
      .from("show_watch_entries")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "poster_wall")
      .in("show_id", remove)
      .select("id");
    if (!error) removed = (data ?? []).length;
  }

  return NextResponse.json({ added, removed });
}
