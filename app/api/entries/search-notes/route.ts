import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import type { NoteMatch, WatchPrecision } from "@/lib/types";

const querySchema = z.object({ q: z.string().trim().min(1).max(200) });

type MovieNoteRow = {
  watched_on: string | null;
  precision: WatchPrecision;
  era_label: string | null;
  note: string | null;
  films: { id: number; title: string; release_year: number | null; poster_path: string | null } | null;
};

type ShowNoteRow = {
  watched_on: string | null;
  precision: WatchPrecision;
  era_label: string | null;
  note: string | null;
  shows: { id: number; name: string; first_air_year: number | null; poster_path: string | null } | null;
};

/**
 * Memory search (§ ROADMAP.md #6) — the /search page matches titles
 * only; this is the other half, searching the free-text notes the user
 * actually wrote. .textSearch computes to_tsvector on the fly (no
 * migration/index needed at personal-library scale) against both
 * watch_entries and show_watch_entries, scoped to the current user by
 * RLS the same way every other direct query in this app is.
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
  const parsed = querySchema.safeParse({ q: searchParams.get("q") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_query", message: copy.errors.invalidQuery } },
      { status: 400 },
    );
  }

  const query = parsed.data.q;

  const [moviesResult, showsResult] = await Promise.all([
    supabase
      .from("watch_entries")
      .select("watched_on, precision, era_label, note, films(id, title, release_year, poster_path)")
      .not("note", "is", null)
      .textSearch("note", query, { type: "websearch" }),
    supabase
      .from("show_watch_entries")
      .select("watched_on, precision, era_label, note, shows(id, name, first_air_year, poster_path)")
      .not("note", "is", null)
      .textSearch("note", query, { type: "websearch" }),
  ]);

  if (moviesResult.error || showsResult.error) {
    return NextResponse.json(
      { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
      { status: 500 },
    );
  }

  const movieRows = (moviesResult.data ?? []) as unknown as MovieNoteRow[];
  const showRows = (showsResult.data ?? []) as unknown as ShowNoteRow[];

  const movieMatches: NoteMatch[] = movieRows
    .filter((row) => row.films !== null && row.note !== null)
    .map((row) => ({
      mediaType: "movie" as const,
      id: row.films!.id,
      title: row.films!.title,
      year: row.films!.release_year,
      posterPath: row.films!.poster_path,
      watchedOn: row.watched_on,
      precision: row.precision,
      eraLabel: row.era_label,
      note: row.note!,
    }));

  const showMatches: NoteMatch[] = showRows
    .filter((row) => row.shows !== null && row.note !== null)
    .map((row) => ({
      mediaType: "show" as const,
      id: row.shows!.id,
      title: row.shows!.name,
      year: row.shows!.first_air_year,
      posterPath: row.shows!.poster_path,
      watchedOn: row.watched_on,
      precision: row.precision,
      eraLabel: row.era_label,
      note: row.note!,
    }));

  const matches = [...movieMatches, ...showMatches].sort((a, b) =>
    (b.watchedOn ?? "").localeCompare(a.watchedOn ?? ""),
  );

  return NextResponse.json(matches);
}
