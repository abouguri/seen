import "server-only";
import {
  discoverTmdbMoviesByDecade,
  fetchTmdbDirectedFilms,
  fetchTmdbRecommendations,
  findTmdbDirectorId,
} from "@/lib/tmdb/client";
import type { TmdbSearchResult } from "@/lib/tmdb/raw-types";
import type {
  Archive,
  ArchiveFilm,
  Recommendation,
  Recommendations,
  Shelf,
} from "@/lib/recommendations/types";

/**
 * The recommender.
 *
 * The thesis, and it constrains everything below: SEEN only contains
 * films the user actually finished, which is what earns it the right to
 * recommend — and sets the standard that every card carries a visible
 * one-line reason that is true and checkable against the user's own
 * archive. If a section can't produce that sentence it produces nothing.
 * There is no generic "you might like" path anywhere in this file, and
 * no popularity, trending or top-10 signal: the only inputs are the
 * user's own films, their own ratings, and TMDB's factual metadata
 * (who directed what, what a film is related to, when it came out).
 *
 * Failure is per-section by construction. Every TMDB-backed section runs
 * inside settled() and contributes nothing if its source throws, because
 * the alternative — an empty shelf with a placeholder — is the thing the
 * brief rules out.
 */

/** Ratings are stored 1–10; a 4★ is an 8. */
export const FOUR_STARS = 8;
const FIVE_STARS = 10;

/** Below this the archive is too thin for director or blind-spot
 *  analysis to say anything true, so the page runs in its reduced form. */
export const THIN_ARCHIVE = 8;

/** A capped row, never a carousel. */
const SHELF_SIZE = 6;

/** The page is capped at five sections including the lead. */
const MAX_SHELVES = 4;

/** How many directors get a TMDB round trip. Each costs two cached
 *  requests (name → id, id → filmography); six covers the top of any
 *  realistic archive without turning one page render into thirty calls. */
const MAX_DIRECTORS_ANALYSED = 6;

/** "Worth another look" only reaches back this far. */
const REWATCH_YEARS = 3;

function yearOf(result: TmdbSearchResult): number | null {
  const date = result.release_date;
  if (!date) return null;
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

/** 10 → "5★", 9 → "4.5★", 8 → "4★". */
function stars(rating: number): string {
  const value = rating / 2;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}★`;
}

/**
 * A candidate only becomes a card if it has a poster and a year. Both
 * are presentation requirements — a poster-less tile in a grid of covers
 * reads as a loading failure — but the filter does real work beyond
 * that: person credits are full of shorts, TV movies and untitled
 * projects, and requiring both strips most of them.
 */
export function isPresentable(result: TmdbSearchResult): boolean {
  return Boolean(result.poster_path) && yearOf(result) !== null;
}

function toRecommendation(result: TmdbSearchResult, reason: string): Recommendation {
  return {
    id: result.id,
    title: result.title,
    year: yearOf(result),
    posterPath: result.poster_path,
    reason,
  };
}

/** Runs a section, and swallows its failure into "this section has
 *  nothing to say" rather than failing the page. */
async function settled<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch {
    return fallback;
  }
}

/* -------------------------------------------------------------------------
   Director analysis — shared by the lead and by "Complete the director".
   Both need the same expensive thing (a filmography per director), so it
   is computed once per render and handed to both.
   ------------------------------------------------------------------------- */

type DirectorProfile = {
  name: string;
  /** The user's own films by this director. */
  seen: ArchiveFilm[];
  /** Every film TMDB credits them with directing, presentable ones only. */
  filmography: TmdbSearchResult[];
  /** Filmography entries the user has not logged and has not dismissed,
   *  most popular first. */
  gaps: TmdbSearchResult[];
  /** How many of the filmography the user has actually seen. Counted
   *  against the filmography rather than against `seen`, so the "3 of 11"
   *  line can never claim more seen than the denominator holds. */
  seenInFilmography: number;
};

async function buildDirectorProfiles(archive: Archive): Promise<DirectorProfile[]> {
  const byDirector = new Map<string, ArchiveFilm[]>();
  for (const film of archive.films) {
    for (const director of film.directors) {
      const name = director.trim();
      if (!name) continue;
      const list = byDirector.get(name);
      if (list) list.push(film);
      else byDirector.set(name, [film]);
    }
  }

  const candidates = [...byDirector.entries()]
    .filter(([, films]) => films.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_DIRECTORS_ANALYSED);

  const profiles = await Promise.all(
    candidates.map(([name, seen]) =>
      settled<DirectorProfile | null>(async () => {
        const personId = await findTmdbDirectorId(name);
        if (personId === null) return null;

        const filmography = (await fetchTmdbDirectedFilms(personId)).filter(isPresentable);
        if (filmography.length === 0) return null;

        const gaps = filmography
          .filter(
            (film) => !archive.loggedIds.has(film.id) && !archive.dismissedIds.has(film.id),
          )
          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

        return {
          name,
          seen,
          filmography,
          gaps,
          seenInFilmography: filmography.filter((film) => archive.loggedIds.has(film.id))
            .length,
        };
      }, null),
    ),
  );

  return profiles.filter((profile): profile is DirectorProfile => profile !== null);
}

/* -------------------------------------------------------------------------
   1. The lead — one film, argued.
   ------------------------------------------------------------------------- */

function buildLead(profiles: DirectorProfile[]): Recommendation | null {
  const usable = profiles.filter((profile) => profile.gaps.length > 0);
  if (usable.length === 0) return null;

  // The strongest claim available, in order. Each variant is only used
  // when the sentence it produces is literally true of this archive.
  const best = usable.reduce((a, b) => (b.seen.length > a.seen.length ? b : a));
  const pick = best.gaps[0];

  const rated = best.seen.filter((film) => film.rating !== null);
  const allHighlyRated = rated.length >= 2 && rated.every((f) => (f.rating ?? 0) >= FOUR_STARS);

  // "more than any other director" has to be checked, not assumed — it's
  // only true when nothing else in the archive ties it.
  const isSoleTop = profiles.every(
    (profile) => profile === best || profile.seen.length < best.seen.length,
  );

  let reason: string;
  if (allHighlyRated) {
    reason =
      `You've finished ${best.seen.length} ${best.name} films and rated every one 4★ or higher. ` +
      `You haven't logged ${pick.title}.`;
  } else if (isSoleTop) {
    reason =
      `You've finished ${best.seen.length} ${best.name} films — more than any other director ` +
      `in your archive. You haven't logged ${pick.title}.`;
  } else {
    reason =
      `You've finished ${best.seen.length} ${best.name} films. You haven't logged ${pick.title}.`;
  }

  return toRecommendation(pick, reason);
}

/**
 * The lead for an archive too thin for director analysis: seed from the
 * single highest-rated film. Names TMDB as the source out loud — the
 * reason still has to be checkable, and "we asked the database what sits
 * closest to this" is the true answer here.
 */
async function buildSeededLead(archive: Archive): Promise<Recommendation | null> {
  const seed = topRated(archive.films)[0];
  if (!seed || seed.rating === null) return null;

  return settled(async () => {
    const results = (await fetchTmdbRecommendations(seed.id))
      .filter(isPresentable)
      .filter((film) => !archive.loggedIds.has(film.id) && !archive.dismissedIds.has(film.id));

    const pick = results[0];
    if (!pick) return null;

    return toRecommendation(
      pick,
      `You rated ${seed.title} ${stars(seed.rating!)} — the highest in your archive. ` +
        `${pick.title} is the film TMDB places closest to it.`,
    );
  }, null);
}

function topRated(films: ArchiveFilm[]): ArchiveFilm[] {
  return films
    .filter((film) => film.rating !== null && film.rating >= FOUR_STARS)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

/* -------------------------------------------------------------------------
   2. Complete the director.
   ------------------------------------------------------------------------- */

function buildDirectorShelves(profiles: DirectorProfile[], leadId: number | null): Shelf[] {
  return profiles
    .filter((profile) => profile.seenInFilmography >= 2 && profile.gaps.length > 0)
    .sort((a, b) => b.seenInFilmography - a.seenInFilmography)
    .slice(0, 1)
    .map((profile) => {
      const items = profile.gaps
        .filter((film) => film.id !== leadId)
        .slice(0, SHELF_SIZE)
        .map((film) =>
          toRecommendation(
            film,
            `${profile.name}, ${yearOf(film)} — one of the ${
              profile.filmography.length - profile.seenInFilmography
            } you haven't logged.`,
          ),
        );

      return {
        kind: "complete-director" as const,
        title: `Complete ${profile.name}`,
        reason: `You've seen ${profile.seenInFilmography} of ${profile.name}'s ${profile.filmography.length}.`,
        items,
      };
    })
    .filter((shelf) => shelf.items.length > 0);
}

/* -------------------------------------------------------------------------
   3. Blind spots — the thinnest decade, offered as an invitation.
   ------------------------------------------------------------------------- */

async function buildBlindSpotShelf(
  archive: Archive,
  leadId: number | null,
): Promise<Shelf | null> {
  const counts = new Map<number, number>();
  for (const film of archive.films) {
    if (film.year === null) continue;
    const decade = Math.floor(film.year / 10) * 10;
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
  }

  // Needs something to be thin *relative to* — a single decade in the
  // archive has no thinnest, and calling it one would be a scold
  // dressed up as a fact.
  if (counts.size < 2) return null;

  const [decade, count] = [...counts.entries()].reduce((a, b) => (b[1] < a[1] ? b : a));

  return settled(async () => {
    const items = (await discoverTmdbMoviesByDecade(decade))
      .filter(isPresentable)
      .filter((film) => !archive.loggedIds.has(film.id) && !archive.dismissedIds.has(film.id))
      .filter((film) => film.id !== leadId)
      .slice(0, SHELF_SIZE)
      .map((film) =>
        toRecommendation(film, `${yearOf(film)} — from the decade your archive is thinnest on.`),
      );

    if (items.length === 0) return null;

    return {
      kind: "blind-spot" as const,
      title: `Your ${decade}s are thin`,
      reason: `Your ${decade}s shelf is the thinnest — ${count} ${count === 1 ? "film" : "films"}.`,
      items,
    };
  }, null);
}

/* -------------------------------------------------------------------------
   4. Because you rated X highly. At most two.
   ------------------------------------------------------------------------- */

async function buildSeedShelves(
  archive: Archive,
  leadId: number | null,
  limit: number,
): Promise<Shelf[]> {
  const seeds = topRated(archive.films).slice(0, limit);

  const shelves = await Promise.all(
    seeds.map((seed) =>
      settled<Shelf | null>(async () => {
        const items = (await fetchTmdbRecommendations(seed.id))
          .filter(isPresentable)
          .filter(
            (film) => !archive.loggedIds.has(film.id) && !archive.dismissedIds.has(film.id),
          )
          .filter((film) => film.id !== leadId)
          .slice(0, SHELF_SIZE)
          .map((film) => toRecommendation(film, `Close to ${seed.title}, which you rated ${stars(seed.rating!)}.`));

        if (items.length === 0) return null;

        return {
          kind: "because-rated" as const,
          // The heading only says "five stars" when it was five stars.
          title:
            seed.rating === FIVE_STARS
              ? `Because you rated ${seed.title} five stars`
              : `Because you rated ${seed.title} ${stars(seed.rating!)}`,
          reason: `Films TMDB places closest to ${seed.title} — none of them already in your library.`,
          items,
        };
      }, null),
    ),
  );

  return shelves.filter((shelf): shelf is Shelf => shelf !== null);
}

/* -------------------------------------------------------------------------
   5. Worth another look — the one shelf that recommends the library back
   to itself, which is why every card on it is labelled a rewatch.
   ------------------------------------------------------------------------- */

function buildRewatchShelf(archive: Archive): Shelf | null {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - REWATCH_YEARS);

  const candidates = archive.films
    .filter((film) => film.rating !== null && film.rating >= FOUR_STARS)
    .filter((film) => film.lastWatchedOn !== null && new Date(film.lastWatchedOn) < cutoff)
    .filter((film) => !archive.dismissedIds.has(film.id))
    .sort((a, b) => (a.lastWatchedOn ?? "").localeCompare(b.lastWatchedOn ?? ""));

  if (candidates.length === 0) return null;

  return {
    kind: "rewatch",
    title: "Worth another look",
    reason: "Rated highly, and you haven't watched them in years.",
    items: candidates.slice(0, SHELF_SIZE).map((film) => ({
      id: film.id,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      isRewatch: true,
      reason: `You rated it ${stars(film.rating!)} and last saw it in ${
        film.lastWatchedOn!.slice(0, 4)
      }.`,
    })),
  };
}

/* ------------------------------------------------------------------------- */

/**
 * Assembles the page. Three shapes, chosen by how much the archive can
 * actually support:
 *
 *  - 0 films: nothing is possible and pretending otherwise would be the
 *    lie this whole feature is built against. Returns empty; the page
 *    renders a real empty state.
 *  - under 8: the lead and one seeded shelf. Director and blind-spot
 *    analysis both need a body of work to be true about, and at six
 *    films "your 1990s are thinnest" is noise.
 *  - 8 and up: everything, capped at five sections.
 */
export async function buildRecommendations(archive: Archive): Promise<Recommendations> {
  const libraryCount = archive.films.length;

  if (libraryCount === 0) {
    return { libraryCount, lead: null, shelves: [] };
  }

  if (libraryCount < THIN_ARCHIVE) {
    const lead = await buildSeededLead(archive);
    const shelves = await buildSeedShelves(archive, lead?.id ?? null, 1);
    return { libraryCount, lead, shelves };
  }

  const profiles = await buildDirectorProfiles(archive);
  const lead = buildLead(profiles) ?? (await buildSeededLead(archive));
  const leadId = lead?.id ?? null;

  const [blindSpot, seedShelves] = await Promise.all([
    buildBlindSpotShelf(archive, leadId),
    buildSeedShelves(archive, leadId, 2),
  ]);

  const rewatch = buildRewatchShelf(archive);

  const shelves = dedupeAcrossShelves([
    ...buildDirectorShelves(profiles, leadId),
    ...(blindSpot ? [blindSpot] : []),
    ...seedShelves,
    ...(rewatch ? [rewatch] : []),
  ]).slice(0, MAX_SHELVES);

  return { libraryCount, lead, shelves };
}

/**
 * The same film can legitimately qualify for two shelves — a Fincher gap
 * that is also close to a five-star seed, say. Showing it twice makes
 * the page look like it has less to say than it does, and invites the
 * reader to compare two different reasons for the same card. First shelf
 * wins; a shelf emptied by the subtraction is dropped rather than
 * rendered bare.
 *
 * The rewatch shelf is exempt from the *library* dedupe by design (it is
 * the one shelf that recommends films already logged) but not from this
 * one, which is about the page not repeating itself.
 */
function dedupeAcrossShelves(shelves: Shelf[]): Shelf[] {
  const seen = new Set<number>();
  const out: Shelf[] = [];

  for (const shelf of shelves) {
    const items = shelf.items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    if (items.length > 0) out.push({ ...shelf, items });
  }

  return out;
}
