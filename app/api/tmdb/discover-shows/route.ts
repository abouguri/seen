import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { discoverTmdbShowsByYear } from "@/lib/tmdb/client";
import { resolveShowSummaries } from "@/lib/tmdb/resolve-show-summaries";
import { checkRateLimit } from "@/lib/rate-limit";
import { copy } from "@/lib/copy";

const RATE_LIMIT_PER_MINUTE = 60;

const querySchema = z.object({
  year: z.coerce.number().int().min(1870).max(new Date().getFullYear() + 5),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

/** Mirrors app/api/tmdb/discover/route.ts — first_air_date_year instead
 *  of primary_release_year (see discoverTmdbShowsByYear). */
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

  const { allowed } = await checkRateLimit(user.id, "tmdb_discover_shows", RATE_LIMIT_PER_MINUTE);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: copy.errors.rateLimited } },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    year: searchParams.get("year"),
    page: searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_query", message: copy.errors.invalidQuery } },
      { status: 400 },
    );
  }

  let tmdbResults;
  try {
    tmdbResults = await discoverTmdbShowsByYear(parsed.data.year, parsed.data.page);
  } catch {
    return NextResponse.json(
      { error: { code: "tmdb_unreachable", message: copy.errors.tmdbUnreachable } },
      { status: 502 },
    );
  }

  const results = await resolveShowSummaries(supabase, tmdbResults);

  return NextResponse.json(results);
}
