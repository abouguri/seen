import "server-only";
import type { Stats } from "@/lib/types";

type EntryRow = {
  id: string;
  film_id: number;
  watched_on: string | null;
  created_at: string;
  films: { title: string; runtime: number | null; directors: string[] | null } | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * §6.8: films per year, decades watched, most-seen directors, total
 * hours, longest gap between two viewings of the same film, first and
 * last film logged. Computed here (server-side) from one query's worth of
 * rows rather than a client-side crunch — a personal library is small
 * enough (hundreds to a few thousand entries) that in-memory aggregation
 * beats standing up SQL group-bys or an RPC for six numbers.
 */
export function computeStats(entries: EntryRow[]): Stats {
  const yearCounts = new Map<number, number>();
  const decadeCounts = new Map<number, number>();
  const directorCounts = new Map<string, number>();
  let totalMinutes = 0;

  for (const entry of entries) {
    if (entry.watched_on) {
      const year = Number(entry.watched_on.slice(0, 4));
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
      const decade = Math.floor(year / 10) * 10;
      decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    }
    for (const director of entry.films?.directors ?? []) {
      directorCounts.set(director, (directorCounts.get(director) ?? 0) + 1);
    }
    if (entry.films?.runtime) totalMinutes += entry.films.runtime;
  }

  // Longest gap between two viewings of the same film — only dated
  // entries can contribute; group by film, sort, take the widest
  // consecutive gap per film, then the widest across all films.
  const datedByFilm = new Map<number, { watchedOn: string; title: string }[]>();
  for (const entry of entries) {
    if (!entry.watched_on || !entry.films) continue;
    const list = datedByFilm.get(entry.film_id) ?? [];
    list.push({ watchedOn: entry.watched_on, title: entry.films.title });
    datedByFilm.set(entry.film_id, list);
  }

  let longestGap: Stats["longestGap"] = null;
  for (const [filmId, viewings] of datedByFilm) {
    if (viewings.length < 2) continue;
    const sorted = [...viewings].sort((a, b) => a.watchedOn.localeCompare(b.watchedOn));
    for (let i = 1; i < sorted.length; i++) {
      const days = Math.round(
        (new Date(sorted[i].watchedOn).getTime() - new Date(sorted[i - 1].watchedOn).getTime()) /
          MS_PER_DAY,
      );
      if (!longestGap || days > longestGap.days) {
        longestGap = { filmId, title: sorted[i].title, days };
      }
    }
  }

  let firstLogged: Stats["firstLogged"] = null;
  let lastLogged: Stats["lastLogged"] = null;
  for (const entry of entries) {
    if (!entry.films) continue;
    if (!firstLogged || entry.created_at < firstLogged.createdAt) {
      firstLogged = { filmId: entry.film_id, title: entry.films.title, createdAt: entry.created_at };
    }
    if (!lastLogged || entry.created_at > lastLogged.createdAt) {
      lastLogged = { filmId: entry.film_id, title: entry.films.title, createdAt: entry.created_at };
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
