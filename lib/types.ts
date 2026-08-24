export type WatchPrecision = "day" | "month" | "year" | "era" | "unknown";

export type FilmSummary = {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  seen: boolean;
  lastWatchedOn: string | null;
  lastWatchedPrecision: WatchPrecision | null;
  lastWatchedEraLabel: string | null;
  /** Does this user have a source='poster_wall' row for this film? The
   *  wall may only ever remove entries it created itself (§9) — a film
   *  seen only via a manual/import entry is displayed but not toggleable. */
  hasPosterWallEntry: boolean;
};

export type FilmDetail = {
  id: number;
  title: string;
  originalTitle: string | null;
  year: number | null;
  runtime: number | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  directors: string[];
  genres: string[];
  tmdbRating: number | null;
};

export type LibrarySort = "recent_added" | "recent_watched" | "release_year" | "rating" | "title";

export type LibraryFilm = {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  watchCount: number;
  lastWatchedOn: string | null;
  rating: number | null;
};

export type LibraryFilters = {
  decades: number[];
  genres: string[];
  directors: string[];
  tags: string[];
};

export type ImportSource = "letterboxd" | "imdb" | "seen_export";

/** One row from a parsed import file, normalised to a common shape
 *  regardless of source format. */
export type NormalizedImportRow = {
  rowIndex: number;
  title: string;
  year: number | null;
  watchedOn: string | null;
  rating: number | null;
  /** IMDb's Const column — an exact external id, matched via TMDB's
   *  /find endpoint before falling back to title+year search (fix 2). */
  imdbId?: string;
  /** Only present for our own JSON export re-import — skips matching
   *  entirely since the film id is already known, and these carry the
   *  fields CSV formats have no column for, preserved for exact re-import. */
  filmId?: number;
  precision?: WatchPrecision;
  eraLabel?: string | null;
  note?: string | null;
  place?: string | null;
  company?: string | null;
};

export type ImportCandidate = {
  filmId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
};

export type ImportMatchStatus = "matched" | "ambiguous" | "unmatched";

export type ImportMatchResult = {
  rowIndex: number;
  status: ImportMatchStatus;
  row: NormalizedImportRow;
  /** Set when status is "matched" (auto) or once the user picks one for
   *  an "ambiguous" row. */
  filmId: number | null;
  candidates: ImportCandidate[];
};

export type WatchEntry = {
  id: string;
  filmId: number;
  watchedOn: string | null;
  precision: WatchPrecision;
  eraLabel: string | null;
  rating: number | null;
  note: string | null;
  place: string | null;
  company: string | null;
  createdAt: string;
  tags: string[];
};

export type Stats = {
  filmsPerYear: { year: number; count: number }[];
  decadesWatched: { decade: number; count: number }[];
  mostSeenDirectors: { name: string; count: number }[];
  totalHours: number;
  longestGap: { filmId: number; title: string; days: number } | null;
  firstLogged: { filmId: number; title: string; createdAt: string } | null;
  lastLogged: { filmId: number; title: string; createdAt: string } | null;
};

/** Full-fidelity export shape (§6.9) — also the format re-imported for
 *  the JSON round trip, since only this format can preserve precision. */
export type SeenExportEntry = {
  filmId: number;
  title: string;
  year: number | null;
  watchedOn: string | null;
  precision: WatchPrecision;
  eraLabel: string | null;
  rating: number | null;
  note: string | null;
  place: string | null;
  company: string | null;
};

export type SeenExport = {
  exportedAt: string;
  appName: string;
  entries: SeenExportEntry[];
};
