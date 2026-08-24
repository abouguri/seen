import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/constants";
import { copy } from "@/lib/copy";
import type { SeenExport, SeenExportEntry } from "@/lib/types";

type EntryWithFilm = {
  film_id: number;
  watched_on: string | null;
  precision: string;
  era_label: string | null;
  rating: number | null;
  note: string | null;
  place: string | null;
  company: string | null;
  created_at: string;
  films: { title: string; release_year: number | null } | null;
};

async function fetchAllEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<EntryWithFilm[]> {
  const PAGE_SIZE = 1000;
  const all: EntryWithFilm[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("watch_entries")
      .select(
        "film_id, watched_on, precision, era_label, rating, note, place, company, created_at, films(title, release_year)",
      )
      .order("film_id", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...(data as unknown as EntryWithFilm[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

function toCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Letterboxd's diary import CSV columns (Title, Year, WatchedDate,
 * Rating10, Rewatch, Tags) — reconstructed from memory since Letterboxd's
 * own import docs weren't reachable to double-check live in this
 * session; worth a spot-check against their current docs before relying
 * on this for an actual Letterboxd import. WatchedDate is left blank for
 * anything less precise than a real day (§9: never render/emit a fake
 * precise date) — Letterboxd's format has no fuzzy-date concept.
 */
function buildLetterboxdCsv(entries: EntryWithFilm[]): string {
  const seenFilmIds = new Set<number>();
  const rows = entries.map((entry) => {
    const isRewatch = seenFilmIds.has(entry.film_id);
    seenFilmIds.add(entry.film_id);

    const title = entry.films?.title ?? "";
    const year = entry.films?.release_year ?? "";
    const watchedDate = entry.precision === "day" ? (entry.watched_on ?? "") : "";
    const rating10 = entry.rating ?? "";

    return [
      toCsvField(title),
      String(year),
      watchedDate,
      String(rating10),
      isRewatch ? "true" : "false",
      "",
    ].join(",");
  });

  return ["Title,Year,WatchedDate,Rating10,Rewatch,Tags", ...rows].join("\n");
}

function buildSeenExportJson(entries: EntryWithFilm[]): SeenExport {
  const exportEntries: SeenExportEntry[] = entries.map((entry) => ({
    filmId: entry.film_id,
    title: entry.films?.title ?? "",
    year: entry.films?.release_year ?? null,
    watchedOn: entry.watched_on,
    precision: entry.precision as SeenExportEntry["precision"],
    eraLabel: entry.era_label,
    rating: entry.rating,
    note: entry.note,
    place: entry.place,
    company: entry.company,
  }));

  return {
    exportedAt: new Date().toISOString(),
    appName: APP_NAME,
    entries: exportEntries,
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
  const format = searchParams.get("format");

  let entries: EntryWithFilm[];
  try {
    entries = await fetchAllEntries(supabase);
  } catch {
    return NextResponse.json(
      { error: { code: "export_failed", message: copy.errors.exportFailed } },
      { status: 500 },
    );
  }

  const dateStamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = buildLetterboxdCsv(entries);
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="seen-export-${dateStamp}.csv"`,
      },
    });
  }

  if (format === "json") {
    const json = JSON.stringify(buildSeenExportJson(entries), null, 2);
    return new NextResponse(json, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="seen-export-${dateStamp}.json"`,
      },
    });
  }

  return NextResponse.json(
    { error: { code: "invalid_format", message: copy.errors.exportFailed } },
    { status: 400 },
  );
}
