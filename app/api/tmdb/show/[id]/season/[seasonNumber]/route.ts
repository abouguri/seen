import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSeasonDetail } from "@/lib/tmdb/get-season-detail";
import { checkRateLimit } from "@/lib/rate-limit";
import { copy } from "@/lib/copy";

const RATE_LIMIT_PER_MINUTE = 60;

/** Mirrors app/api/tmdb/show/[id]/route.ts — season number in the path
 *  instead of just an id. Called client-side by SeasonChecklist on
 *  season expand, on-demand — never blocking the show page's initial
 *  render, since episode lists are large. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; seasonNumber: string }> },
) {
  const { id: idParam, seasonNumber: seasonNumberParam } = await params;
  const id = Number(idParam);
  const seasonNumber = Number(seasonNumberParam);

  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(seasonNumber) || seasonNumber < 0) {
    return NextResponse.json(
      { error: { code: "invalid_id", message: copy.errors.showNotFound } },
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

  const { allowed } = await checkRateLimit(user.id, "tmdb_season", RATE_LIMIT_PER_MINUTE);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: copy.errors.rateLimited } },
      { status: 429 },
    );
  }

  const result = await getSeasonDetail(id, seasonNumber);

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

  return NextResponse.json(result.season);
}
