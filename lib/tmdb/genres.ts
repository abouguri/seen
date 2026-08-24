import "server-only";

const TMDB_BASE = "https://api.themoviedb.org/3";

/**
 * Search/discover results carry genre_ids, not resolved names — this is
 * what lets genres get filled at cache-upsert time with zero extra
 * per-film requests (fix 2): one shared lookup, fetched once and cached
 * for 30 days (TMDB's genre list essentially never changes), reused for
 * every result in every search/discover call.
 */
export async function getGenreMap(): Promise<Map<number, string>> {
  const res = await fetch(`${TMDB_BASE}/genre/movie/list`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
      accept: "application/json",
    },
    next: { revalidate: 2592000 }, // 30 days
  });

  if (!res.ok) {
    // Missing genres is degraded, not broken — callers fall back to an
    // empty map rather than failing the whole search/discover request.
    return new Map();
  }

  const data = (await res.json()) as { genres: { id: number; name: string }[] };
  return new Map(data.genres.map((g) => [g.id, g.name]));
}

export function mapGenreIds(genreIds: number[] | undefined, genreMap: Map<number, string>): string[] {
  if (!genreIds) return [];
  return genreIds.map((id) => genreMap.get(id)).filter((name): name is string => Boolean(name));
}
