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

/** Show equivalents of FilmSummary/FilmDetail — field-name-aligned to
 *  the film shapes wherever the underlying concept is the same, so
 *  components written for films (PosterTile, search result rows) don't
 *  need show-specific branching to render one. */
export type ShowSummary = {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  seen: boolean;
  lastWatchedOn: string | null;
  lastWatchedPrecision: WatchPrecision | null;
  lastWatchedEraLabel: string | null;
  hasPosterWallEntry: boolean;
};

export type ShowDetail = {
  id: number;
  title: string;
  originalTitle: string | null;
  /** First-air year — a show has no single release year. */
  year: number | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  /** TV's created_by, not a director list. */
  creators: string[];
  genres: string[];
  tmdbRating: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  status: string | null;
};

/** One season's summary — always known once a show's detail is fetched,
 *  since TMDB includes it natively in /tv/{id}. episodeCount is the
 *  checklist's per-season denominator; the episodes themselves are a
 *  separate, on-demand fetch (see SeasonDetail). */
export type SeasonSummary = {
  id: number;
  showId: number;
  seasonNumber: number;
  name: string | null;
  episodeCount: number | null;
  posterPath: string | null;
};

export type EpisodeSummary = {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  stillPath: string | null;
  runtimeMinutes: number | null;
};

/** A season's full episode list — fetched on-demand when a season is
 *  expanded in the checklist, not up front (episode lists are large). */
export type SeasonDetail = SeasonSummary & {
  overview: string | null;
  airDate: string | null;
  episodes: EpisodeSummary[];
};

/** Episode-level viewing entry — the same fuzzy-date model as
 *  WatchEntry/ShowWatchEntry, one row per episode marked seen. No tags,
 *  same reasoning as ShowWatchEntry. */
export type EpisodeWatchEntry = {
  id: string;
  showId: number;
  seasonNumber: number;
  episodeId: number;
  watchedOn: string | null;
  precision: WatchPrecision;
  eraLabel: string | null;
  rating: number | null;
  note: string | null;
  place: string | null;
  company: string | null;
  createdAt: string;
};

export type LibrarySort = "recent_added" | "recent_watched" | "release_year" | "rating" | "title";

export type LibraryFilm = {
  mediaType: "movie";
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  watchCount: number;
  lastWatchedOn: string | null;
  rating: number | null;
};

/** Show-level tracking (§ TV support plan) — one row per viewing, same
 *  fuzzy-date/rating model as a film, not per-episode. Field names match
 *  LibraryFilm exactly (title/year, not name/firstAirYear) so UI built
 *  for films — LibraryTile, PosterTile — renders shows unmodified. */
export type LibraryShow = {
  mediaType: "show";
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  watchCount: number;
  lastWatchedOn: string | null;
  rating: number | null;
};

/** What /api/library actually returns once mediaType=all merges both
 *  sources — narrow on .mediaType to get the specific shape back. */
export type LibraryItem = LibraryFilm | LibraryShow;

export type FilterOption<T> = { value: T; count: number };

/** Counted so the filter dropdowns can show "1990s (3)" and grey out —
 *  never suggest — an option that would return zero films. */
export type LibraryFilters = {
  decades: FilterOption<number>[];
  genres: FilterOption<string>[];
  directors: FilterOption<string>[];
  tags: FilterOption<string>[];
  rated: { rated: number; unrated: number };
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

/** Show-level viewing entry — "I watched this show", the same fuzzy-date
 *  model as WatchEntry. No tags: show tagging is out of scope for now. */
export type ShowWatchEntry = {
  id: string;
  showId: number;
  watchedOn: string | null;
  precision: WatchPrecision;
  eraLabel: string | null;
  rating: number | null;
  note: string | null;
  place: string | null;
  company: string | null;
  createdAt: string;
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
