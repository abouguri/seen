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
