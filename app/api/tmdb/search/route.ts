import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchTmdbMovies } from "@/lib/tmdb/client";
import { upsertFilmSummary } from "@/lib/tmdb/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildSeenMap } from "@/lib/seen";
import { copy } from "@/lib/copy";
import type { FilmSummary } from "@/lib/types";

const RATE_LIMIT_PER_MINUTE = 30;

const querySchema = z.object({ q: z.string().trim().min(1).max(200) });

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

  const { allowed } = await checkRateLimit(user.id, "tmdb_search", RATE_LIMIT_PER_MINUTE);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: copy.errors.rateLimited } },
      { status: 429 },
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

  let tmdbResults;
  try {
    tmdbResults = await searchTmdbMovies(parsed.data.q);
  } catch {
    return NextResponse.json(
      { error: { code: "tmdb_unreachable", message: copy.errors.tmdbUnreachable } },
      { status: 502 },
    );
  }

  const admin = createAdminClient();
  await Promise.all(tmdbResults.map((movie) => upsertFilmSummary(admin, movie)));

  const filmIds = tmdbResults.map((movie) => movie.id);
  const { data: entries } = await supabase
    .from("watch_entries")
    .select("film_id, watched_on, precision, era_label, created_at")
    .in("film_id", filmIds.length ? filmIds : [-1]);

  const seenMap = buildSeenMap(entries ?? []);

  const results: FilmSummary[] = tmdbResults.map((movie) => {
    const seen = seenMap.get(movie.id);
    return {
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
      posterPath: movie.poster_path,
      seen: Boolean(seen),
      lastWatchedOn: seen?.watchedOn ?? null,
      lastWatchedPrecision: seen?.precision ?? null,
      lastWatchedEraLabel: seen?.eraLabel ?? null,
    };
  });

  // Library matches sort first (§6.4).
  results.sort((a, b) => Number(b.seen) - Number(a.seen));

  return NextResponse.json(results);
}
