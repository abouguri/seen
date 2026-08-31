import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getFilmDetail } from "@/lib/tmdb/get-detail";
import { getShowDetail } from "@/lib/tmdb/get-show-detail";
import { copy } from "@/lib/copy";

const bodySchema = z.object({ newId: z.number().int().positive() });

/**
 * "Fix a bad match" (§ ROADMAP.md #3): moves every one of the current
 * user's watch_entries/show_watch_entries rows from the wrong id to the
 * right one. RLS scopes every read/write here to auth.uid() = user_id —
 * same as DELETE /api/library/[filmId] — so this can never touch another
 * user's rows, and it never writes to films/shows themselves (those are
 * a global cache; getFilmDetail/getShowDetail only ever upsert, never
 * mutate an existing row's identity).
 */
export async function POST(request: Request, { params }: { params: Promise<{ filmId: string }> }) {
  const { filmId: filmIdParam } = await params;
  const oldId = Number(filmIdParam);
  const mediaType = new URL(request.url).searchParams.get("mediaType") === "show" ? "show" : "movie";

  if (!Number.isInteger(oldId) || oldId <= 0) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_id",
          message: mediaType === "show" ? copy.errors.showNotFound : copy.errors.filmNotFound,
        },
      },
      { status: 400 },
    );
  }

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
  if (!parsed.success || parsed.data.newId === oldId) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: copy.errors.rematchFailed } },
      { status: 400 },
    );
  }
  const { newId } = parsed.data;

  // Ensure the target is cached — watch_entries.film_id / show_watch_
  // entries.show_id both carry a foreign key, so repointing to an
  // uncached id would fail that constraint.
  if (mediaType === "show") {
    const result = await getShowDetail(newId);
    if (result.status === "not_found") {
      return NextResponse.json(
        { error: { code: "not_found", message: copy.errors.showNotFound } },
        { status: 404 },
      );
    }
    if (result.status === "unreachable") {
      return NextResponse.json(
        { error: { code: "tmdb_unreachable", message: copy.errors.tmdbUnreachable } },
        { status: 502 },
      );
    }
  } else {
    const result = await getFilmDetail(newId);
    if (result.status === "not_found") {
      return NextResponse.json(
        { error: { code: "not_found", message: copy.errors.filmNotFound } },
        { status: 404 },
      );
    }
    if (result.status === "unreachable") {
      return NextResponse.json(
        { error: { code: "tmdb_unreachable", message: copy.errors.tmdbUnreachable } },
        { status: 502 },
      );
    }
  }

  const movedCount = await moveEntries(supabase, mediaType, oldId, newId);

  return NextResponse.json({ movedCount });
}

/**
 * Two steps, not one: watch_entries_poster_wall_unique / show_watch_
 * entries_poster_wall_unique restrict at most one source='poster_wall'
 * row per (user, id). A single bulk UPDATE would fail entirely if the
 * user already separately has a poster_wall row for `newId` — so that
 * row (there's at most one) is handled on its own, falling back to a
 * delete if the move would collide. Either outcome leaves the correct
 * title marked seen, which is all that matters here.
 */
async function moveEntries(
  supabase: SupabaseClient,
  mediaType: "movie" | "show",
  oldId: number,
  newId: number,
): Promise<number> {
  const table = mediaType === "show" ? "show_watch_entries" : "watch_entries";
  const idColumn = mediaType === "show" ? "show_id" : "film_id";

  const { data: bulkMoved } = await supabase
    .from(table)
    .update({ [idColumn]: newId })
    .eq(idColumn, oldId)
    .neq("source", "poster_wall")
    .select("id");

  let posterWallMoved = 0;
  const { data: posterWallRow } = await supabase
    .from(table)
    .select("id")
    .eq(idColumn, oldId)
    .eq("source", "poster_wall")
    .maybeSingle();

  if (posterWallRow) {
    const { error: updateError } = await supabase
      .from(table)
      .update({ [idColumn]: newId })
      .eq("id", posterWallRow.id);

    if (updateError) {
      // The user already has a poster_wall row for newId — the old one
      // is now redundant.
      await supabase.from(table).delete().eq("id", posterWallRow.id);
    } else {
      posterWallMoved = 1;
    }
  }

  return (bulkMoved ?? []).length + posterWallMoved;
}
