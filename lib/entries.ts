type SummarizableEntry = { rating: number | null; watchedOn: string | null };

/**
 * The three "at a glance" figures (seen count, best rating, last seen)
 * from a list of viewings. A pure derivation, not a query: both detail
 * pages already fetch their full entries list for ViewingHistory, and
 * entries arrive pre-sorted `watched_on desc nulls last, created_at desc`
 * — so `lastWatchedOn` is just the first entry that has one, matching the
 * `max(watched_on)` semantics of the user_films/user_shows views without
 * a second query.
 */
export function summarizeEntries<T extends SummarizableEntry>(
  entries: T[],
): { watchCount: number; rating: number | null; lastWatchedOn: string | null } {
  const ratings = entries.map((e) => e.rating).filter((r): r is number => r !== null);
  return {
    watchCount: entries.length,
    rating: ratings.length ? Math.max(...ratings) : null,
    lastWatchedOn: entries.find((e) => e.watchedOn !== null)?.watchedOn ?? null,
  };
}
