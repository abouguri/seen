import "server-only";
import { findMovieByImdbId, searchTmdbMovies } from "@/lib/tmdb/client";
import { upsertFilmSummary } from "@/lib/tmdb/cache";
import { getGenreMap, mapGenreIds } from "@/lib/tmdb/genres";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TmdbSearchResult } from "@/lib/tmdb/raw-types";
import type { ImportCandidate, ImportMatchResult, NormalizedImportRow } from "@/lib/types";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function toCandidate(movie: TmdbSearchResult): ImportCandidate {
  return {
    filmId: movie.id,
    title: movie.title,
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
    posterPath: movie.poster_path,
  };
}

/**
 * Matches one row against TMDB search results. Prefers an exact title
 * match combined with an exact year match; falls back to fewer/weaker
 * signals in a defined order, landing on "ambiguous" (2-3 candidates)
 * rather than guessing whenever more than one plausible film remains.
 */
function classifyMatch(row: NormalizedImportRow, results: TmdbSearchResult[]): {
  status: "matched" | "ambiguous" | "unmatched";
  filmId: number | null;
  candidates: ImportCandidate[];
} {
  if (results.length === 0) return { status: "unmatched", filmId: null, candidates: [] };

  const normalizedRowTitle = normalizeTitle(row.title);
  const exactTitleMatches = results.filter(
    (r) =>
      normalizeTitle(r.title) === normalizedRowTitle ||
      (r.original_title && normalizeTitle(r.original_title) === normalizedRowTitle),
  );
  const pool = exactTitleMatches.length > 0 ? exactTitleMatches : results.slice(0, 5);

  if (row.year) {
    const yearMatches = pool.filter(
      (r) => r.release_date && r.release_date.slice(0, 4) === String(row.year),
    );
    if (yearMatches.length === 1) {
      return { status: "matched", filmId: yearMatches[0].id, candidates: [] };
    }
    if (yearMatches.length > 1) {
      return { status: "ambiguous", filmId: null, candidates: yearMatches.slice(0, 3).map(toCandidate) };
    }
    // No exact year match, but a single plausible title match — likely a
    // release-date discrepancy between sources rather than a wrong film.
    if (pool.length === 1) {
      return { status: "matched", filmId: pool[0].id, candidates: [] };
    }
  } else if (pool.length === 1) {
    return { status: "matched", filmId: pool[0].id, candidates: [] };
  }

  if (pool.length > 1) {
    return { status: "ambiguous", filmId: null, candidates: pool.slice(0, 3).map(toCandidate) };
  }

  return { status: "unmatched", filmId: null, candidates: [] };
}

type Admin = ReturnType<typeof createAdminClient>;

async function matchByTitleYear(
  row: NormalizedImportRow,
  admin: Admin,
  genreMap: Map<number, string>,
): Promise<ImportMatchResult> {
  let searchResults: TmdbSearchResult[] = [];
  try {
    searchResults = await searchTmdbMovies(row.title);
  } catch {
    return { rowIndex: row.rowIndex, status: "unmatched", row, filmId: null, candidates: [] };
  }

  const classified = classifyMatch(row, searchResults);

  // Upsert exactly the films the outcome references — the winning match,
  // or the surfaced ambiguous candidates — not just the first page of raw
  // results. classifyMatch's exact-title filter scans the *full* results
  // list, so a match can rank outside the first 5; upserting only the
  // first 5 left a "matched" row pointing at a film that was never
  // cached, which then failed the commit's films foreign key and silently
  // killed the whole batch, not just that one row.
  const referencedIds = new Set<number>();
  if (classified.filmId) referencedIds.add(classified.filmId);
  for (const candidate of classified.candidates) referencedIds.add(candidate.filmId);

  await Promise.all(
    searchResults
      .filter((movie) => referencedIds.has(movie.id))
      .map((movie) => upsertFilmSummary(admin, movie, mapGenreIds(movie.genre_ids, genreMap))),
  );

  return { rowIndex: row.rowIndex, row, ...classified };
}

/** Matches a batch of rows against TMDB, caching every film the outcome
 *  actually references along the way (so a later commit can always find
 *  it). */
export async function matchImportBatch(rows: NormalizedImportRow[]): Promise<ImportMatchResult[]> {
  const admin = createAdminClient();
  const genreMap = await getGenreMap();
  const results: ImportMatchResult[] = [];

  for (const row of rows) {
    // Our own JSON export already knows the film id — no search needed.
    if (row.filmId) {
      results.push({ rowIndex: row.rowIndex, status: "matched", row, filmId: row.filmId, candidates: [] });
      continue;
    }

    // IMDb's Const column is an exact external id (fix 2) — try it before
    // falling back to fuzzy title+year search. Letterboxd's export has no
    // equivalent: its URI is a bare slug (e.g. /film/the-matrix/) with no
    // embedded TMDB/IMDb id, and resolving one would mean scraping each
    // film's Letterboxd page per row, which is both slow and not
    // sanctioned by anything Letterboxd documents — so Letterboxd rows
    // always go through title+year.
    if (row.imdbId) {
      try {
        const found = await findMovieByImdbId(row.imdbId);
        if (found.length === 1) {
          await upsertFilmSummary(admin, found[0], mapGenreIds(found[0].genre_ids, genreMap));
          results.push({ rowIndex: row.rowIndex, status: "matched", row, filmId: found[0].id, candidates: [] });
          continue;
        }
        if (found.length > 1) {
          await Promise.all(
            found.slice(0, 3).map((movie) => upsertFilmSummary(admin, movie, mapGenreIds(movie.genre_ids, genreMap))),
          );
          results.push({
            rowIndex: row.rowIndex,
            status: "ambiguous",
            row,
            filmId: null,
            candidates: found.slice(0, 3).map(toCandidate),
          });
          continue;
        }
        // No result for this id — fall through to title+year below.
      } catch {
        // TMDB find failed — fall through to title+year below.
      }
    }

    results.push(await matchByTitleYear(row, admin, genreMap));
  }

  return results;
}
