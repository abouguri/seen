import "server-only";
import type { WatchPrecision } from "@/lib/types";

type EntryRow = {
  film_id: number;
  watched_on: string | null;
  precision: string;
  era_label: string | null;
  created_at: string;
};

export type SeenInfo = {
  watchedOn: string | null;
  precision: WatchPrecision;
  eraLabel: string | null;
};

/**
 * Picks the "last watched" entry per film for the seen badge. Not a pure
 * chronological max — watched_on is null for era/unknown precision, so
 * this prefers the most recent *known* date, falling back to the most
 * recently logged entry when every entry for that film is date-less.
 */
export function buildSeenMap(entries: EntryRow[]): Map<number, SeenInfo> {
  const best = new Map<number, EntryRow>();

  for (const entry of entries) {
    const current = best.get(entry.film_id);
    if (!current) {
      best.set(entry.film_id, entry);
      continue;
    }

    const entryHasDate = entry.watched_on !== null;
    const currentHasDate = current.watched_on !== null;

    if (entryHasDate && !currentHasDate) {
      best.set(entry.film_id, entry);
    } else if (entryHasDate && currentHasDate) {
      if (entry.watched_on! > current.watched_on!) best.set(entry.film_id, entry);
    } else if (!entryHasDate && !currentHasDate) {
      if (entry.created_at > current.created_at) best.set(entry.film_id, entry);
    }
  }

  const result = new Map<number, SeenInfo>();
  for (const [filmId, entry] of best) {
    result.set(filmId, {
      watchedOn: entry.watched_on,
      precision: entry.precision as WatchPrecision,
      eraLabel: entry.era_label,
    });
  }
  return result;
}
