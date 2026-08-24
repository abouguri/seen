import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { matchImportBatch } from "@/lib/import/match";
import { copy } from "@/lib/copy";

// A batch at a time (§9: import must be resumable) — the client chunks
// the full file into batches of this size or smaller and retries just
// the failed batch on error, never losing already-matched rows.
const MAX_BATCH_SIZE = 50;

const rowSchema = z.object({
  rowIndex: z.number().int(),
  title: z.string().trim().min(1),
  year: z.number().int().nullable(),
  watchedOn: z.string().date().nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
  imdbId: z.string().trim().min(1).optional(),
  filmId: z.number().int().positive().optional(),
  precision: z.enum(["day", "month", "year", "era", "unknown"]).optional(),
  eraLabel: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  place: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(MAX_BATCH_SIZE),
});

export async function POST(request: Request) {
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
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: copy.errors.importFailed } },
      { status: 400 },
    );
  }

  try {
    const results = await matchImportBatch(parsed.data.rows);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: { code: "match_failed", message: copy.errors.importFailed } },
      { status: 502 },
    );
  }
}
