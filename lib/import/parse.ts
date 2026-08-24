import Papa from "papaparse";
import type { ImportSource, NormalizedImportRow, SeenExport } from "@/lib/types";

export type ParsedImportFile = {
  source: ImportSource;
  rows: NormalizedImportRow[];
};

function detectCsvSource(fields: string[]): ImportSource | null {
  const set = new Set(fields.map((f) => f.trim()));
  if (set.has("Letterboxd URI") || (set.has("Date") && set.has("Name") && set.has("Year"))) {
    return "letterboxd";
  }
  if (set.has("Const") && set.has("Your Rating") && set.has("Title")) {
    return "imdb";
  }
  return null;
}

function toIntOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDateOrNull(value: string | undefined): string | null {
  if (!value) return null;
  // Both Letterboxd and IMDb exports use YYYY-MM-DD already.
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : null;
}

function normalizeLetterboxdRow(row: Record<string, string>, rowIndex: number): NormalizedImportRow {
  return {
    rowIndex,
    title: (row["Name"] ?? "").trim(),
    year: toIntOrNull(row["Year"]),
    watchedOn: toDateOrNull(row["Date"]),
    rating: null,
  };
}

function normalizeImdbRow(row: Record<string, string>, rowIndex: number): NormalizedImportRow {
  const rating = toIntOrNull(row["Your Rating"]);
  return {
    rowIndex,
    title: (row["Title"] ?? "").trim(),
    year: toIntOrNull(row["Year"]),
    watchedOn: toDateOrNull(row["Date Rated"]),
    rating: rating !== null && rating >= 1 && rating <= 10 ? rating : null,
  };
}

/** Parses a Letterboxd watched.csv or IMDb ratings export. */
export function parseCsvFile(file: File): Promise<ParsedImportFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        const source = detectCsvSource(fields);
        if (!source) {
          reject(new Error("unrecognised_format"));
          return;
        }
        const normalize = source === "letterboxd" ? normalizeLetterboxdRow : normalizeImdbRow;
        const rows = results.data
          .map((row, i) => normalize(row, i))
          .filter((row) => row.title.length > 0);
        resolve({ source, rows });
      },
      error: (err: Error) => reject(err),
    });
  });
}

/** Parses our own JSON export for re-import — the only path that can
 *  restore precision exactly, since CSV formats have no such concept. */
export function parseSeenExportFile(file: File): Promise<ParsedImportFile> {
  return file.text().then((text) => {
    const data = JSON.parse(text) as SeenExport;
    if (!Array.isArray(data.entries)) throw new Error("unrecognised_format");
    const rows: NormalizedImportRow[] = data.entries.map((entry, rowIndex) => ({
      rowIndex,
      title: entry.title,
      year: entry.year,
      watchedOn: entry.watchedOn,
      rating: entry.rating,
      filmId: entry.filmId,
      precision: entry.precision,
      eraLabel: entry.eraLabel,
      note: entry.note,
      place: entry.place,
      company: entry.company,
    }));
    return { source: "seen_export", rows };
  });
}

export function parseImportFile(file: File): Promise<ParsedImportFile> {
  if (file.name.toLowerCase().endsWith(".json")) return parseSeenExportFile(file);
  return parseCsvFile(file);
}
