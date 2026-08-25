import "server-only";
import type { Stats } from "@/lib/types";

export type MovieEntryRow = {
  id: string;
  film_id: number;
  watched_on: string | null;
  created_at: string;
  films: {
    title: string;
    runtime: number | null;
    directors: string[] | null;
    release_year: number | null;
  } | null;
};

export type ShowEntryRow = {
  id: string;
  show_id: number;
  watched_on: string | null;
  created_at: string;
  shows: {
    name: string;
    first_air_year: number | null;
  } | null;
};

// Both movie and show entries normalize down to this before aggregation —
// keeps one code path instead of two near-identical ones, and (mediaType,
// itemId) is the real key everywhere a film/show id is grouped: a bare
// itemId isn't unique across the two (TMDB's movie and tv id namespaces
// collide), so grouping by itemId alone could silently merge an unrelated
// movie and show's rewatch history under longestGap/first/lastLogged.
type NormalizedEntry = {
  mediaType: "movie" | "show";
  itemId: number;
  watchedOn: string | null;
  createdAt: string;
  title: string;
  year: number | null;
  directors: string[];
  runtimeMinutes: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeMovieEntries(entries: MovieEntryRow[]): NormalizedEntry[] {
  return entries
    .filter((e) => e.films !== null)
    .map((e) => ({
      mediaType: "movie" as const,
      itemId: e.film_id,
      watchedOn: e.watched_on,
      createdAt: e.created_at,
      title: e.films!.title,
      year: e.films!.release_year,
      directors: e.films!.directors ?? [],
      runtimeMinutes: e.films!.runtime,
    }));
}

function normalizeShowEntries(entries: ShowEntryRow[]): NormalizedEntry[] {
  return entries
    .filter((e) => e.shows !== null)
    .map((e) => ({
      mediaType: "show" as const,
      itemId: e.show_id,
      watchedOn: e.watched_on,
      createdAt: e.created_at,
      title: e.shows!.name,
      year: e.shows!.first_air_year,
      // Directors stays a movie-only concept — shows have creators, a
      // separate credit type, deliberately not folded into the same
      // "most-seen directors" stat (§ TV support plan).
      directors: [],
      // No single-viewing duration exists at show granularity without an
      // episodes table — totalHours stays movie-only, a documented gap,
      // not a bug.
      runtimeMinutes: null,
    }));
}

/**
 * §6.8: titles per year, decades watched, most-seen directors, total
 * hours, longest gap between two viewings of the same title, first and
 * last title logged. Computed here (server-side) from one query's worth
 * of rows rather than a client-side crunch — a personal library is small
 * enough (hundreds to a few thousand entries) that in-memory aggregation
 * beats standing up SQL group-bys or an RPC for six numbers.
 *
 * Takes movie and show entries separately (they come from two different
 * tables/queries) and normalizes both before aggregating, so every stat
 * below runs over one combined list instead of two parallel
 * near-duplicate implementations.
 */
export function computeStats(movieEntries: MovieEntryRow[], showEntries: ShowEntryRow[] = []): Stats {
  const entries = [...normalizeMovieEntries(movieEntries), ...normalizeShowEntries(showEntries)];

  const yearCounts = new Map<number, number>();
  const decadeCounts = new Map<number, number>();
  const directorCounts = new Map<string, number>();
  let totalMinutes = 0;

  for (const entry of entries) {
    // A dated viewing wins; a poster-wall add or any other undated entry
    // still has a real title behind it, so fall back to release/first-air
    // year rather than dropping it from the chart entirely — otherwise a
    // library added mostly through bulk-add reads as almost empty here.
    const year = entry.watchedOn ? Number(entry.watchedOn.slice(0, 4)) : entry.year;
    if (year !== null) {
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
      const decade = Math.floor(year / 10) * 10;
      decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    }
    for (const director of entry.directors) {
      directorCounts.set(director, (directorCounts.get(director) ?? 0) + 1);
    }
    if (entry.runtimeMinutes) totalMinutes += entry.runtimeMinutes;
  }

  // Longest gap between two viewings of the same title — only dated
  // entries can contribute; group by (mediaType, itemId), sort, take the
  // widest consecutive gap per title, then the widest across all titles.
  const datedByItem = new Map<string, { watchedOn: string; entry: NormalizedEntry }[]>();
  for (const entry of entries) {
    if (!entry.watchedOn) continue;
    const key = `${entry.mediaType}:${entry.itemId}`;
    const list = datedByItem.get(key) ?? [];
    list.push({ watchedOn: entry.watchedOn, entry });
    datedByItem.set(key, list);
  }

  let longestGap: Stats["longestGap"] = null;
  for (const viewings of datedByItem.values()) {
    if (viewings.length < 2) continue;
    const sorted = [...viewings].sort((a, b) => a.watchedOn.localeCompare(b.watchedOn));
    for (let i = 1; i < sorted.length; i++) {
      const days = Math.round(
        (new Date(sorted[i].watchedOn).getTime() - new Date(sorted[i - 1].watchedOn).getTime()) /
          MS_PER_DAY,
      );
      if (!longestGap || days > longestGap.days) {
        longestGap = { filmId: sorted[i].entry.itemId, title: sorted[i].entry.title, days };
      }
    }
  }

  let firstLogged: Stats["firstLogged"] = null;
  let lastLogged: Stats["lastLogged"] = null;
  for (const entry of entries) {
    if (!firstLogged || entry.createdAt < firstLogged.createdAt) {
      firstLogged = { filmId: entry.itemId, title: entry.title, createdAt: entry.createdAt };
    }
    if (!lastLogged || entry.createdAt > lastLogged.createdAt) {
      lastLogged = { filmId: entry.itemId, title: entry.title, createdAt: entry.createdAt };
    }
  }

  const mostSeenDirectors = [...directorCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    filmsPerYear: [...yearCounts.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    decadesWatched: [...decadeCounts.entries()]
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => a.decade - b.decade),
    mostSeenDirectors,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    longestGap,
    firstLogged,
    lastLogged,
  };
}
