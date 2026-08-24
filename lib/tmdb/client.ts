import "server-only";
import type {
  TmdbFindResponse,
  TmdbMovieDetail,
  TmdbSearchResponse,
  TmdbSearchResult,
} from "@/lib/tmdb/raw-types";

const TMDB_BASE = "https://api.themoviedb.org/3";

export class TmdbError extends Error {}
export class TmdbNotFoundError extends Error {}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
    accept: "application/json",
  };
}

/**
 * Search results are cached in Next's Data Cache for 24h, keyed by the
 * normalised query — shared across every user searching the same title
 * (§5). The films-table cache upsert on top of this is a separate layer.
 */
export async function searchTmdbMovies(query: string): Promise<TmdbSearchResult[]> {
  const normalised = query.trim().toLowerCase();
  const url = `${TMDB_BASE}/search/movie?query=${encodeURIComponent(normalised)}&include_adult=false`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB search failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbSearchResponse;
  return data.results;
}

/**
 * Discover results share TMDB's movie-summary shape with search, so they
 * reuse TmdbSearchResult/TmdbSearchResponse rather than a parallel type.
 * Cached the same way as search (§5) — the poster wall re-fetching the
 * same year+page is extremely common (re-visiting a year).
 */
export async function discoverTmdbMoviesByYear(
  year: number,
  page: number,
): Promise<TmdbSearchResult[]> {
  const url = `${TMDB_BASE}/discover/movie?sort_by=popularity.desc&primary_release_year=${year}&page=${page}&include_adult=false`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB discover failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbSearchResponse;
  return data.results;
}

/**
 * IMDb import rows carry a real external id (the Const column) — exact
 * enough to skip title/year search entirely (fix 2). Cached like search:
 * an id maps to the same film for everyone.
 */
export async function findMovieByImdbId(imdbId: string): Promise<TmdbSearchResult[]> {
  const url = `${TMDB_BASE}/find/${encodeURIComponent(imdbId)}?external_source=imdb_id`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB find failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbFindResponse;
  return data.movie_results;
}

export async function fetchTmdbMovieDetail(id: number): Promise<TmdbMovieDetail> {
  const url = `${TMDB_BASE}/movie/${id}?append_to_response=credits`;

  const res = await fetch(url, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new TmdbNotFoundError(`TMDB film ${id} not found`);
  }
  if (!res.ok) {
    throw new TmdbError(`TMDB detail fetch failed with status ${res.status}`);
  }

  return (await res.json()) as TmdbMovieDetail;
}
