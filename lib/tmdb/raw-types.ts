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
  /** Search/discover give ids, not resolved names — see lib/tmdb/genres.ts. */
  genre_ids?: number[];
};

export type TmdbSearchResponse = {
  results: TmdbSearchResult[];
};

/** Response shape from /find/{external_id}?external_source=... — TMDB
 *  always includes tv_results alongside movie_results, even when it's
 *  unused (as it is here for now; see lib/tmdb/client.ts findMovieByImdbId). */
export type TmdbFindResponse = {
  movie_results: TmdbSearchResult[];
  tv_results: TmdbTvSearchResult[];
};

export type TmdbTvSearchResult = {
  id: number;
  name: string;
  original_name?: string | null;
  first_air_date?: string | null;
  poster_path: string | null;
  overview?: string | null;
  vote_average?: number | null;
  popularity?: number | null;
  /** Search/discover give ids, not resolved names — see lib/tmdb/genres.ts.
   *  TV's genre id vocabulary is not the same list as movies'. */
  genre_ids?: number[];
};

export type TmdbTvSearchResponse = {
  results: TmdbTvSearchResult[];
};

export type TmdbCreatedBy = {
  name: string;
};

export type TmdbTvDetail = {
  id: number;
  name: string;
  original_name?: string | null;
  first_air_date?: string | null;
  last_air_date?: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview?: string | null;
  genres?: TmdbGenre[];
  vote_average?: number | null;
  popularity?: number | null;
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  status?: string | null;
  /** In the base /tv/{id} response natively — unlike a movie's directors,
   *  no append_to_response=credits fetch is needed for this. */
  created_by?: TmdbCreatedBy[];
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

/** /search/person — only what's needed to pick the right director out of
 *  a name collision. known_for_department is the discriminator: a search
 *  for "Jane Campion" also returns actors and writers of that name. */
export type TmdbPersonSearchResult = {
  id: number;
  name: string;
  known_for_department?: string | null;
  popularity?: number | null;
};

export type TmdbPersonSearchResponse = {
  results: TmdbPersonSearchResult[];
};

/** /person/{id}/movie_credits. The crew array is what carries directing
 *  work; `cast` is ignored here. One person can appear more than once on
 *  the same film (director *and* writer), so callers must dedupe by id. */
export type TmdbPersonMovieCredits = {
  crew: (TmdbSearchResult & { job?: string | null; department?: string | null })[];
};
