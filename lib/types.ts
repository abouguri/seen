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
};
