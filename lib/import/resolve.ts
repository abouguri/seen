import type { NormalizedImportRow, WatchPrecision } from "@/lib/types";

/**
 * Dates from a file are always precision='day' (§10 M5 scope) — never a
 * guessed finer precision. Rows without a date are 'unknown', never a
 * fabricated date. Our own JSON export is the one exception: it already
 * carries the original precision, restored as-is for exact round trip.
 */
export function resolveEntryFields(row: NormalizedImportRow): {
  watchedOn: string | null;
  precision: WatchPrecision;
  eraLabel: string | null;
  rating: number | null;
  note: string | null;
  place: string | null;
  company: string | null;
} {
  if (row.precision) {
    return {
      watchedOn: row.watchedOn,
      precision: row.precision,
      eraLabel: row.eraLabel ?? null,
      rating: row.rating,
      note: row.note ?? null,
      place: row.place ?? null,
      company: row.company ?? null,
    };
  }
  return {
    watchedOn: row.watchedOn,
    precision: row.watchedOn ? "day" : "unknown",
    eraLabel: null,
    rating: row.rating,
    note: row.note ?? null,
    place: row.place ?? null,
    company: row.company ?? null,
  };
}
