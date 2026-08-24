import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import type { LibraryFilm } from "@/lib/types";

const PAGE_SIZE = 60;

const querySchema = z.object({
  sort: z
    .enum(["recent_added", "recent_watched", "release_year", "rating", "title"])
    .default("recent_added"),
  decade: z.coerce.number().int().optional(),
  genre: z.string().trim().min(1).optional(),
  director: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  rated: z.enum(["rated", "unrated"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

// §9: nulls last in every date sort — an unknown date is never "1970".
const SORT_CONFIG: Record<
  z.infer<typeof querySchema>["sort"],
  { column: string; ascending: boolean; nullsFirst: boolean }
> = {
  recent_added: { column: "added_at", ascending: false, nullsFirst: false },
  recent_watched: { column: "last_watched_on", ascending: false, nullsFirst: false },
  release_year: { column: "release_year", ascending: false, nullsFirst: false },
  rating: { column: "rating", ascending: false, nullsFirst: false },
  title: { column: "title", ascending: true, nullsFirst: false },
};

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
  const parsed = querySchema.safeParse({
    sort: searchParams.get("sort") ?? undefined,
    decade: searchParams.get("decade") ?? undefined,
    genre: searchParams.get("genre") ?? undefined,
    director: searchParams.get("director") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    rated: searchParams.get("rated") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_query", message: copy.errors.libraryLoadFailed } },
      { status: 400 },
    );
  }

  const { sort, decade, genre, director, tag, rated, page } = parsed.data;
  const sortConfig = SORT_CONFIG[sort];

  let taggedFilmIds: number[] | null = null;
  if (tag) {
    const { data: taggedRows, error: tagError } = await supabase
      .from("entry_tags")
      .select("watch_entries!inner(film_id), tags!inner(name)")
      .eq("tags.name", tag);
    if (tagError) {
      return NextResponse.json(
        { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
        { status: 500 },
      );
    }
    taggedFilmIds = [
      ...new Set((taggedRows ?? []).map((row) => (row.watch_entries as unknown as { film_id: number }).film_id)),
    ];
    if (taggedFilmIds.length === 0) {
      return NextResponse.json({ films: [], total: 0 });
    }
  }

  let query = supabase
    .from("user_films")
    .select("id, title, release_year, poster_path, watch_count, last_watched_on, rating", {
      count: "exact",
    });

  if (taggedFilmIds) query = query.in("id", taggedFilmIds);

  if (decade !== undefined) {
    query = query.gte("release_year", decade).lt("release_year", decade + 10);
  }
  if (genre) query = query.contains("genres", [genre]);
  if (director) query = query.contains("directors", [director]);
  if (rated === "rated") query = query.not("rating", "is", null);
  if (rated === "unrated") query = query.is("rating", null);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await query
    .order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: sortConfig.nullsFirst })
    .order("id", { ascending: true }) // stable tiebreak so pagination never skips/repeats rows
    .range(from, to);

  if (error) {
    return NextResponse.json(
      { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
      { status: 500 },
    );
  }

  const films: LibraryFilm[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    year: row.release_year,
    posterPath: row.poster_path,
    watchCount: row.watch_count,
    lastWatchedOn: row.last_watched_on,
    rating: row.rating,
  }));

  return NextResponse.json({ films, total: count ?? 0 });
}
