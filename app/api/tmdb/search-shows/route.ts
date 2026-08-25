import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchTmdbShows } from "@/lib/tmdb/client";
import { resolveShowSummaries } from "@/lib/tmdb/resolve-show-summaries";
import { checkRateLimit } from "@/lib/rate-limit";
import { copy } from "@/lib/copy";

const RATE_LIMIT_PER_MINUTE = 30;

const querySchema = z.object({ q: z.string().trim().min(1).max(200) });

/** Mirrors app/api/tmdb/search/route.ts exactly, tv instead of movie. */
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

  const { allowed } = await checkRateLimit(user.id, "tmdb_search_shows", RATE_LIMIT_PER_MINUTE);
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
    tmdbResults = await searchTmdbShows(parsed.data.q);
  } catch {
    return NextResponse.json(
      { error: { code: "tmdb_unreachable", message: copy.errors.tmdbUnreachable } },
      { status: 502 },
    );
  }

  const results = await resolveShowSummaries(supabase, tmdbResults);

  results.sort((a, b) => Number(b.seen) - Number(a.seen));

  return NextResponse.json(results);
}
