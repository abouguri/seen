import "server-only";
import { searchTmdbMovies } from "@/lib/tmdb/client";
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

/** Matches a batch of rows against TMDB, caching every result seen along the way. */
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

    let searchResults: TmdbSearchResult[] = [];
    try {
      searchResults = await searchTmdbMovies(row.title);
    } catch {
      results.push({ rowIndex: row.rowIndex, status: "unmatched", row, filmId: null, candidates: [] });
      continue;
    }

    await Promise.all(
      searchResults
        .slice(0, 5)
        .map((movie) => upsertFilmSummary(admin, movie, mapGenreIds(movie.genre_ids, genreMap))),
    );

    const classified = classifyMatch(row, searchResults);
    results.push({ rowIndex: row.rowIndex, row, ...classified });
  }

  return results;
}
