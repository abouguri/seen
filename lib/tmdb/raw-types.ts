/** Shapes as TMDB actually sends them over the wire — only the fields we use. */

export type TmdbSearchResult = {
  id: number;
  title: string;
  original_title?: string | null;
  release_date?: string | null;
  poster_path: string | null;
  overview?: string | null;
  vote_average?: number | null;
  popularity?: number | null;
};

export type TmdbSearchResponse = {
  results: TmdbSearchResult[];
};

export type TmdbCrewMember = {
  job: string;
  name: string;
};

export type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbMovieDetail = {
  id: number;
  title: string;
  original_title?: string | null;
  release_date?: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime?: number | null;
  overview?: string | null;
  genres?: TmdbGenre[];
  vote_average?: number | null;
  popularity?: number | null;
  credits?: {
    crew: TmdbCrewMember[];
  };
};
