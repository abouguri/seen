/**
 * The homepage's data shapes.
 *
 * The governing rule of this feature is that every recommendation
 * carries a visible, true one-line reason — so `reason` is a required
 * field on the recommendation type itself, not an optional decoration a
 * shelf may or may not supply. There is deliberately no way to construct
 * a Recommendation without one: if a source can't say why, it can't
 * produce a card, and the shelf renders nothing.
 */

export type Recommendation = {
  /** TMDB movie id. */
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  /** The because-line. One sentence, true, and auditable against the
   *  user's own archive — never a taste inferred from strangers. */
  reason: string;
  /** Set only on the rewatch shelf, where the film IS already in the
   *  library. Everywhere else a film in the library is a dedupe bug, and
   *  this flag is what lets the UI say "rewatch" out loud rather than
   *  looking like one. */
  isRewatch?: boolean;
};

/** The five shelf kinds, in the order the page renders them. */
export type ShelfKind =
  | "complete-director"
  | "complete-actor"
  | "complete-franchise"
  | "blind-spot"
  | "genre-blind-spot"
  | "because-rated"
  | "rewatch";

export type Shelf = {
  kind: ShelfKind;
  /** Heading — names the seed film or director where there is one. */
  title: string;
  /** The shelf-level because-line, shown under the heading. */
  reason: string;
  items: Recommendation[];
};

/** What the page renders. `lead` and `shelves` are both already
 *  deduped and dismissal-filtered by the time this exists. */
export type Recommendations = {
  /** How many films the archive holds — drives which of the three
   *  states the page renders. */
  libraryCount: number;
  lead: Recommendation | null;
  shelves: Shelf[];
};

/** One film in the user's archive, flattened for the engine. */
export type ArchiveFilm = {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  directors: string[];
  genres: string[];
  /** Top 10 billed, TMDB's own order. */
  castMembers: string[];
  /** Both null unless the film has been through a full detail fetch AND
   *  TMDB has it in a collection — most films have neither. */
  collectionId: number | null;
  collectionName: string | null;
  /** 1–10 as stored (5★ = 10). Null when never rated. */
  rating: number | null;
  lastWatchedOn: string | null;
};

/** Everything the engine needs about one user, read once per render. */
export type Archive = {
  films: ArchiveFilm[];
  /** TMDB ids already logged — the dedupe set. */
  loggedIds: Set<number>;
  /** TMDB ids the user has said "not for me" to. */
  dismissedIds: Set<number>;
};
