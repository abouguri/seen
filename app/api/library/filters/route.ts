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
    supabase.from("user_films").select("release_year, genres, directors"),
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

  const decades = new Set<number>();
  const genres = new Set<string>();
  const directors = new Set<string>();
  const tags = new Set<string>();

  for (const row of data ?? []) {
    if (row.release_year) decades.add(Math.floor(row.release_year / 10) * 10);
    for (const g of row.genres ?? []) genres.add(g);
    for (const d of row.directors ?? []) directors.add(d);
  }
  for (const row of tagRows ?? []) {
    const name = (row.tags as unknown as { name: string } | null)?.name;
    if (name) tags.add(name);
  }

  const filters: LibraryFilters = {
    decades: [...decades].sort((a, b) => b - a),
    genres: [...genres].sort(),
    directors: [...directors].sort(),
    tags: [...tags].sort(),
  };

  return NextResponse.json(filters);
}
