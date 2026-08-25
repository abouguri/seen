import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import type { LibraryFilters } from "@/lib/types";

/**
 * Filter option lists are derived from what's actually in the user's
 * library — no point offering a "Nolan" filter that returns zero films.
 * Computed in JS rather than a SQL unnest RPC: the payload (three narrow
 * columns) is small even at a few thousand films, and this avoids a
 * second migration+function round-trip for what's a low-traffic route.
 */
export async function GET() {
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

  const [{ data, error }, { data: tagRows, error: tagError }] = await Promise.all([
    supabase.from("user_films").select("release_year, genres, directors, rating"),
    // Only tags actually attached to an entry — same "don't offer a filter
    // that returns zero films" rule as decade/genre/director above.
    supabase.from("entry_tags").select("tags(name)"),
  ]);

  if (error || tagError) {
    return NextResponse.json(
      { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
      { status: 500 },
    );
  }

  const decades = new Map<number, number>();
  const genres = new Map<string, number>();
  const directors = new Map<string, number>();
  const tags = new Map<string, number>();
  let rated = 0;
  let unrated = 0;

  function bump<T>(map: Map<T, number>, key: T) {
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  for (const row of data ?? []) {
    if (row.release_year) bump(decades, Math.floor(row.release_year / 10) * 10);
    for (const g of row.genres ?? []) bump(genres, g);
    for (const d of row.directors ?? []) bump(directors, d);
    if (row.rating !== null) rated++;
    else unrated++;
  }
  for (const row of tagRows ?? []) {
    const name = (row.tags as unknown as { name: string } | null)?.name;
    if (name) bump(tags, name);
  }

  function toOptions<T>(map: Map<T, number>, sort: (a: T, b: T) => number) {
    return [...map.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => sort(a.value, b.value));
  }

  const filters: LibraryFilters = {
    decades: toOptions(decades, (a, b) => b - a),
    genres: toOptions(genres, (a, b) => a.localeCompare(b)),
    directors: toOptions(directors, (a, b) => a.localeCompare(b)),
    tags: toOptions(tags, (a, b) => a.localeCompare(b)),
    rated: { rated, unrated },
  };

  return NextResponse.json(filters);
}
