import "server-only";
import type {
  TmdbCollectionDetail,
  TmdbFindResponse,
  TmdbPersonDetail,
  TmdbPersonMovieCredits,
  TmdbPersonSearchResponse,
  TmdbPersonSearchResult,
  TmdbMovieDetail,
  TmdbSearchResponse,
  TmdbSearchResult,
  TmdbSeasonDetail,
  TmdbTvDetail,
  TmdbTvSearchResponse,
  TmdbTvSearchResult,
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

/** TV mirrors of the four functions above — same caching, same error
 *  handling. Kept as parallel functions rather than a shared
 *  parameterized implementation, matching this file's existing
 *  movie-only convention. */
export async function searchTmdbShows(query: string): Promise<TmdbTvSearchResult[]> {
  const normalised = query.trim().toLowerCase();
  const url = `${TMDB_BASE}/search/tv?query=${encodeURIComponent(normalised)}&include_adult=false`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB tv search failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbTvSearchResponse;
  return data.results;
}

/** TV's discover filters by first_air_date_year, not primary_release_year. */
export async function discoverTmdbShowsByYear(
  year: number,
  page: number,
): Promise<TmdbTvSearchResult[]> {
  const url = `${TMDB_BASE}/discover/tv?sort_by=popularity.desc&first_air_date_year=${year}&page=${page}&include_adult=false`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB tv discover failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbTvSearchResponse;
  return data.results;
}

/** created_by is native to the base /tv/{id} response, but cast isn't —
 *  append_to_response=credits is needed for that, same as movies. */
export async function fetchTmdbShowDetail(id: number): Promise<TmdbTvDetail> {
  const url = `${TMDB_BASE}/tv/${id}?append_to_response=credits`;

  const res = await fetch(url, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new TmdbNotFoundError(`TMDB show ${id} not found`);
  }
  if (!res.ok) {
    throw new TmdbError(`TMDB tv detail fetch failed with status ${res.status}`);
  }

  return (await res.json()) as TmdbTvDetail;
}

/** No append_to_response needed — episodes are native to this endpoint. */
export async function fetchTmdbSeasonDetail(
  showId: number,
  seasonNumber: number,
): Promise<TmdbSeasonDetail> {
  const url = `${TMDB_BASE}/tv/${showId}/season/${seasonNumber}`;

  const res = await fetch(url, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new TmdbNotFoundError(`TMDB season ${showId}/${seasonNumber} not found`);
  }
  if (!res.ok) {
    throw new TmdbError(`TMDB season detail fetch failed with status ${res.status}`);
  }

  return (await res.json()) as TmdbSeasonDetail;
}

/* ---------------------------------------------------------------------
   Recommendation sources (the homepage).

   All four are cached for a week rather than the 24h the search/discover
   calls above use, and the difference is deliberate: none of these
   answers is user-specific or time-sensitive. A director's filmography
   and a film's related titles change on the order of months, and the
   homepage's freshness requirement is that it tracks *the library*, not
   TMDB — the per-user assembly is recomputed from the database on every
   render, so a newly logged film changes the page immediately while
   these stay cached underneath it.

   Errors are the caller's problem: a shelf whose source throws renders
   nothing at all rather than an empty shelf (see the engine).
   --------------------------------------------------------------------- */

const RECOMMENDATION_TTL = 604800; // 7 days

/**
 * Films TMDB considers related to one the user rated highly — the seed
 * for the "Because you rated X five stars" shelves.
 */
export async function fetchTmdbRecommendations(id: number): Promise<TmdbSearchResult[]> {
  const url = `${TMDB_BASE}/movie/${id}/recommendations`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: RECOMMENDATION_TTL },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB recommendations failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbSearchResponse;
  return data.results;
}

/**
 * Resolves a director's name to a TMDB person id.
 *
 * The films table stores directors as plain names (a text[] column), so
 * completing a filmography means going back through search. The pick is
 * the most popular result whose known_for_department is Directing —
 * without that filter "Anderson" style collisions resolve to whichever
 * actor happens to rank higher, and the shelf then recommends a
 * completely unrelated filmography under a director's name. Returns null
 * rather than guessing when nothing matches.
 */
export async function findTmdbDirectorId(name: string): Promise<number | null> {
  const url = `${TMDB_BASE}/search/person?query=${encodeURIComponent(name.trim())}&include_adult=false`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: RECOMMENDATION_TTL },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB person search failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbPersonSearchResponse;
  const lower = name.trim().toLowerCase();

  const exact = data.results.filter(
    (person: TmdbPersonSearchResult) => person.name.trim().toLowerCase() === lower,
  );
  const directing = exact.filter((person) => person.known_for_department === "Directing");
  const pool = directing.length > 0 ? directing : exact;

  if (pool.length === 0) return null;
  return pool.reduce((best, person) =>
    (person.popularity ?? 0) > (best.popularity ?? 0) ? person : best,
  ).id;
}

/**
 * Resolves an actor's name to a TMDB person id — the acting-side sibling
 * of findTmdbDirectorId, for the "Complete the actor" shelf. Same
 * search/person call, same exact-name-match pool, but prefers
 * known_for_department === "Acting" so a name that collides with a
 * director (or anyone else) doesn't resolve to the wrong filmography.
 * Returns null rather than guessing when nothing matches.
 */
export async function findTmdbActorId(name: string): Promise<number | null> {
  const url = `${TMDB_BASE}/search/person?query=${encodeURIComponent(name.trim())}&include_adult=false`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: RECOMMENDATION_TTL },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB person search failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbPersonSearchResponse;
  const lower = name.trim().toLowerCase();

  const exact = data.results.filter(
    (person: TmdbPersonSearchResult) => person.name.trim().toLowerCase() === lower,
  );
  const acting = exact.filter((person) => person.known_for_department === "Acting");
  const pool = acting.length > 0 ? acting : exact;

  if (pool.length === 0) return null;
  return pool.reduce((best, person) =>
    (person.popularity ?? 0) > (best.popularity ?? 0) ? person : best,
  ).id;
}

/**
 * The person's own bio — for the people page's hero (photo, department,
 * born line). Separate from the search/credits calls above: search only
 * ever needed enough to disambiguate and resolve an id.
 */
export async function fetchTmdbPersonDetail(personId: number): Promise<TmdbPersonDetail> {
  const url = `${TMDB_BASE}/person/${personId}`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: RECOMMENDATION_TTL },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB person detail fetch failed with status ${res.status}`);
  }

  return (await res.json()) as TmdbPersonDetail;
}

/**
 * Everything a person is credited as having directed. TMDB lists a
 * person once per job, so someone who wrote and directed the same film
 * appears twice in `crew` — deduped here by film id so a filmography
 * count ("3 of 11") is never inflated.
 */
export async function fetchTmdbDirectedFilms(personId: number): Promise<TmdbSearchResult[]> {
  const url = `${TMDB_BASE}/person/${personId}/movie_credits`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: RECOMMENDATION_TTL },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB movie credits failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbPersonMovieCredits;
  const byId = new Map<number, TmdbSearchResult>();
  for (const credit of data.crew) {
    if (credit.job !== "Director") continue;
    if (!byId.has(credit.id)) byId.set(credit.id, credit);
  }
  return [...byId.values()];
}

/**
 * Everything a person is credited as having acted in — the sibling of
 * fetchTmdbDirectedFilms, for a person page's "As actor" section. Same
 * endpoint, same cache key, so calling both for one person costs one real
 * TMDB round trip: Next's fetch Data Cache serves the second from the
 * first's response.
 */
export async function fetchTmdbActingFilms(personId: number): Promise<TmdbSearchResult[]> {
  const url = `${TMDB_BASE}/person/${personId}/movie_credits`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: RECOMMENDATION_TTL },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB movie credits failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbPersonMovieCredits;
  const byId = new Map<number, TmdbSearchResult>();
  for (const credit of data.cast ?? []) {
    if (!byId.has(credit.id)) byId.set(credit.id, credit);
  }
  return [...byId.values()];
}

/**
 * Well-regarded films from a decade — the source for the blind-spot
 * shelves. Sorted by vote average rather than popularity, with a vote
 * floor: popularity.desc on an old decade returns whatever is trending
 * now, and no vote floor lets a film with four votes and a 10.0 average
 * top the list.
 */
export async function discoverTmdbMoviesByDecade(
  decade: number,
  page = 1,
): Promise<TmdbSearchResult[]> {
  const url =
    `${TMDB_BASE}/discover/movie?sort_by=vote_average.desc` +
    `&primary_release_date.gte=${decade}-01-01` +
    `&primary_release_date.lte=${decade + 9}-12-31` +
    `&vote_count.gte=500&page=${page}&include_adult=false`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: RECOMMENDATION_TTL },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB decade discover failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbSearchResponse;
  return data.results;
}

/**
 * The same, for a genre. Genres are stored as names on the films table
 * but discover takes ids — callers resolve via lib/tmdb/genres.ts.
 */
export async function discoverTmdbMoviesByGenre(
  genreId: number,
  page = 1,
): Promise<TmdbSearchResult[]> {
  const url =
    `${TMDB_BASE}/discover/movie?sort_by=vote_average.desc` +
    `&with_genres=${genreId}&vote_count.gte=500&page=${page}&include_adult=false`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: RECOMMENDATION_TTL },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB genre discover failed with status ${res.status}`);
  }

  const data = (await res.json()) as TmdbSearchResponse;
  return data.results;
}

/**
 * A franchise's full membership — the source for the "Complete the
 * franchise" shelf. films.collection_id is populated at enrichment time
 * from belongs_to_collection, so this is only ever called with an id
 * already known to exist.
 */
export async function fetchTmdbCollectionDetail(collectionId: number): Promise<TmdbCollectionDetail> {
  const url = `${TMDB_BASE}/collection/${collectionId}`;

  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: RECOMMENDATION_TTL },
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB collection fetch failed with status ${res.status}`);
  }

  return (await res.json()) as TmdbCollectionDetail;
}
