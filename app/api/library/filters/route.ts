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

  const { data, error } = await supabase
    .from("user_films")
    .select("release_year, genres, directors");

  if (error) {
    return NextResponse.json(
      { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
      { status: 500 },
    );
  }

  const decades = new Set<number>();
  const genres = new Set<string>();
  const directors = new Set<string>();

  for (const row of data ?? []) {
    if (row.release_year) decades.add(Math.floor(row.release_year / 10) * 10);
    for (const g of row.genres ?? []) genres.add(g);
    for (const d of row.directors ?? []) directors.add(d);
  }

  const filters: LibraryFilters = {
    decades: [...decades].sort((a, b) => b - a),
    genres: [...genres].sort(),
    directors: [...directors].sort(),
  };

  return NextResponse.json(filters);
}
