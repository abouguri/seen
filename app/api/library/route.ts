import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import type { LibraryFilm, LibraryShow } from "@/lib/types";

const PAGE_SIZE = 60;

const querySchema = z.object({
  sort: z
    .enum(["recent_added", "recent_watched", "release_year", "rating", "title"])
    .default("recent_added"),
  // "all" is the default: the whole point of show support is one
  // unified library, not a second hidden screen. mediaType="movie" is
  // still exactly the original single-source query path (see below),
  // so a caller that never passes this param sees zero behaviour change.
  mediaType: z.enum(["movie", "show", "all"]).default("all"),
  decade: z.coerce.number().int().optional(),
  genre: z.string().trim().min(1).optional(),
  director: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  rated: z.enum(["rated", "unrated"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
type Query = z.infer<typeof querySchema>;

// §9: nulls last in every date sort — an unknown date is never "1970".
const SORT_CONFIG: Record<
  Query["sort"],
  { column: string; ascending: boolean; nullsFirst: boolean }
> = {
  recent_added: { column: "added_at", ascending: false, nullsFirst: false },
  recent_watched: { column: "last_watched_on", ascending: false, nullsFirst: false },
  release_year: { column: "release_year", ascending: false, nullsFirst: false },
  rating: { column: "rating", ascending: false, nullsFirst: false },
  title: { column: "title", ascending: true, nullsFirst: false },
};

// Same sort concept, the show view's column names (first_air_year instead
// of release_year, name instead of title).
const SHOW_SORT_COLUMN: Record<Query["sort"], string> = {
  recent_added: "added_at",
  recent_watched: "last_watched_on",
  release_year: "first_air_year",
  rating: "rating",
  title: "name",
};

type MovieRow = {
  id: number;
  title: string;
  release_year: number | null;
  poster_path: string | null;
  watch_count: number;
  last_watched_on: string | null;
  rating: number | null;
  added_at: string;
};

type ShowRow = {
  id: number;
  name: string;
  first_air_year: number | null;
  poster_path: string | null;
  watch_count: number;
  last_watched_on: string | null;
  rating: number | null;
  added_at: string;
};

function toLibraryFilm(row: MovieRow): LibraryFilm {
  return {
    mediaType: "movie",
    id: row.id,
    title: row.title,
    year: row.release_year,
    posterPath: row.poster_path,
    watchCount: row.watch_count,
    lastWatchedOn: row.last_watched_on,
    rating: row.rating,
  };
}

function toLibraryShow(row: ShowRow): LibraryShow {
  return {
    mediaType: "show",
    id: row.id,
    title: row.name,
    year: row.first_air_year,
    posterPath: row.poster_path,
    watchCount: row.watch_count,
    lastWatchedOn: row.last_watched_on,
    rating: row.rating,
  };
}

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
    mediaType: searchParams.get("mediaType") ?? undefined,
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

  const query = parsed.data;

  // director/tag are film-only concepts today (shows have creators, not
  // directors, and show tagging doesn't exist yet) — a show can never
  // match either filter, so it's correct to exclude shows entirely
  // rather than querying user_shows and getting nothing back.
  const showsExcludedByFilter = Boolean(query.director || query.tag);

  if (query.mediaType === "movie") {
    // Exactly the original single-source path — unchanged query shape,
    // unchanged pagination — so a caller passing mediaType=movie (or an
    // old client that doesn't know about mediaType at all, since "movie"
    // was the only prior behaviour) sees zero difference.
    const result = await fetchMoviesPage(supabase, query);
    if (result.error) {
      return NextResponse.json(
        { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
        { status: 500 },
      );
    }
    return NextResponse.json({ films: result.rows.map(toLibraryFilm), total: result.total });
  }

  if (query.mediaType === "show") {
    if (showsExcludedByFilter) return NextResponse.json({ films: [], total: 0 });
    const result = await fetchShowsPage(supabase, query);
    if (result.error) {
      return NextResponse.json(
        { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
        { status: 500 },
      );
    }
    return NextResponse.json({ films: result.rows.map(toLibraryShow), total: result.total });
  }

  // mediaType === "all": personal libraries are small enough (hundreds to
  // a few thousand rows — same assumption lib/stats/compute.ts and
  // library/filters/route.ts already make) that fetching each source in
  // full and merging/sorting/paginating in JS is simpler and safer than a
  // SQL UNION view here — it keeps a bare numeric id from ever crossing
  // the movie/show boundary (the two TMDB id namespaces collide), which
  // a merged view's single `id` column could not express safely.
  const [movies, shows] = await Promise.all([
    fetchMoviesAll(supabase, query),
    showsExcludedByFilter ? Promise.resolve({ rows: [] as ShowRow[], error: null }) : fetchShowsAll(supabase, query),
  ]);

  if (movies.error || shows.error) {
    return NextResponse.json(
      { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
      { status: 500 },
    );
  }

  // Sorted at the raw-row level (added_at included) rather than after
  // mapping to LibraryFilm/LibraryShow — those public shapes don't carry
  // addedAt, and recent_added (the default sort) needs it.
  const combined: SortableRow[] = [
    ...movies.rows.map((row) => toSortable("movie", row)),
    ...shows.rows.map((row) => toSortable("show", row)),
  ];

  combined.sort((a, b) => compareForSort(a, b, query.sort));

  const from = (query.page - 1) * PAGE_SIZE;
  const page = combined
    .slice(from, from + PAGE_SIZE)
    .map((row) => (row.mediaType === "movie" ? toLibraryFilm(row.raw as MovieRow) : toLibraryShow(row.raw as ShowRow)));

  return NextResponse.json({ films: page, total: combined.length });
}

async function fetchMoviesPage(supabase: Awaited<ReturnType<typeof createClient>>, query: Query) {
  let q = supabase
    .from("user_films")
    .select("id, title, release_year, poster_path, watch_count, last_watched_on, rating, added_at", {
      count: "exact",
    });
  q = applyMovieFilters(q, query);

  const sortConfig = SORT_CONFIG[query.sort];
  const from = (query.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await q
    .order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: sortConfig.nullsFirst })
    .order("id", { ascending: true })
    .range(from, to);

  return { rows: (data ?? []) as MovieRow[], total: count ?? 0, error };
}

async function fetchMoviesAll(supabase: Awaited<ReturnType<typeof createClient>>, query: Query) {
  let q = supabase
    .from("user_films")
    .select("id, title, release_year, poster_path, watch_count, last_watched_on, rating, added_at");
  q = applyMovieFilters(q, query);
  const { data, error } = await q;
  return { rows: (data ?? []) as MovieRow[], error };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMovieFilters(q: any, query: Query) {
  if (query.decade !== undefined) {
    q = q.gte("release_year", query.decade).lt("release_year", query.decade + 10);
  }
  if (query.genre) q = q.contains("genres", [query.genre]);
  if (query.director) q = q.contains("directors", [query.director]);
  if (query.rated === "rated") q = q.not("rating", "is", null);
  if (query.rated === "unrated") q = q.is("rating", null);
  return q;
}

async function fetchShowsPage(supabase: Awaited<ReturnType<typeof createClient>>, query: Query) {
  let q = supabase
    .from("user_shows")
    .select("id, name, first_air_year, poster_path, watch_count, last_watched_on, rating, added_at", {
      count: "exact",
    });
  q = applyShowFilters(q, query);

  const column = SHOW_SORT_COLUMN[query.sort];
  const ascending = query.sort === "title";
  const from = (query.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await q
    .order(column, { ascending, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, to);

  return { rows: (data ?? []) as ShowRow[], total: count ?? 0, error };
}

async function fetchShowsAll(supabase: Awaited<ReturnType<typeof createClient>>, query: Query) {
  let q = supabase
    .from("user_shows")
    .select("id, name, first_air_year, poster_path, watch_count, last_watched_on, rating, added_at");
  q = applyShowFilters(q, query);
  const { data, error } = await q;
  return { rows: (data ?? []) as ShowRow[], error };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyShowFilters(q: any, query: Query) {
  if (query.decade !== undefined) {
    q = q.gte("first_air_year", query.decade).lt("first_air_year", query.decade + 10);
  }
  if (query.genre) q = q.contains("genres", [query.genre]);
  if (query.rated === "rated") q = q.not("rating", "is", null);
  if (query.rated === "unrated") q = q.is("rating", null);
  return q;
}

type SortableRow = {
  mediaType: "movie" | "show";
  id: number;
  title: string;
  year: number | null;
  rating: number | null;
  lastWatchedOn: string | null;
  addedAt: string;
  raw: MovieRow | ShowRow;
};

function toSortable(mediaType: "movie" | "show", row: MovieRow | ShowRow): SortableRow {
  return {
    mediaType,
    id: row.id,
    title: "title" in row ? row.title : row.name,
    year: "release_year" in row ? row.release_year : row.first_air_year,
    rating: row.rating,
    lastWatchedOn: row.last_watched_on,
    addedAt: row.added_at,
    raw: row,
  };
}

// Sort comparator for the merged movie+show array — mirrors SORT_CONFIG's
// semantics (nulls last, stable id tiebreak) since this replaces the DB
// ORDER BY for the mediaType="all" path.
function compareForSort(a: SortableRow, b: SortableRow, sort: Query["sort"]): number {
  const key = <T,>(v: T | null): [number, T | null] => (v === null ? [1, null] : [0, v]);

  let cmp = 0;
  if (sort === "title") {
    cmp = a.title.localeCompare(b.title);
  } else if (sort === "release_year") {
    const [an, av] = key(a.year);
    const [bn, bv] = key(b.year);
    cmp = an !== bn ? an - bn : av !== null && bv !== null ? bv - av : 0;
  } else if (sort === "rating") {
    const [an, av] = key(a.rating);
    const [bn, bv] = key(b.rating);
    cmp = an !== bn ? an - bn : av !== null && bv !== null ? bv - av : 0;
  } else if (sort === "recent_watched") {
    const [an, av] = key(a.lastWatchedOn);
    const [bn, bv] = key(b.lastWatchedOn);
    cmp = an !== bn ? an - bn : av !== null && bv !== null ? (av < bv ? 1 : av > bv ? -1 : 0) : 0;
  } else {
    // recent_added
    cmp = a.addedAt < b.addedAt ? 1 : a.addedAt > b.addedAt ? -1 : 0;
  }
  if (cmp !== 0) return cmp;

  // Stable tiebreak across the merged (mediaType, id) space — a bare id
  // isn't unique across movies and shows (the TMDB id namespaces
  // collide), so the pair is the real key.
  if (a.mediaType !== b.mediaType) return a.mediaType.localeCompare(b.mediaType);
  return a.id - b.id;
}
