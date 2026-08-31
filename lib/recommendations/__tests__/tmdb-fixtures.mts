/** Canned TMDB responses. Every source deliberately returns films the
 *  user has ALREADY LOGGED and films they have DISMISSED, so the dedupe
 *  is actually exercised rather than assumed. */
export const NOLAN_ID = 525;
export const FINCHER_ID = 7467;
export const CAINE_ID = 3151;

const f = (id: number, title: string, year: number, pop = 50) => ({
  id, title, release_date: `${year}-01-01`, poster_path: `/p${id}.jpg`, popularity: pop,
});

// Nolan: user logged 1..5; 6,7 are gaps. 99 has no poster (must be dropped).
export const NOLAN_FILMS = [
  { ...f(1, "Memento", 2000), job: "Director" },
  { ...f(2, "The Prestige", 2006), job: "Director" },
  { ...f(3, "Inception", 2010), job: "Director" },
  { ...f(4, "Interstellar", 2014), job: "Director" },
  { ...f(5, "Dunkirk", 2017), job: "Director" },
  { ...f(6, "Insomnia", 2002, 90), job: "Director" },
  { ...f(7, "Following", 1998, 30), job: "Director" },
  { ...f(3, "Inception", 2010), job: "Writer" },            // dupe credit
  { id: 99, title: "Untitled Short", release_date: "1997-01-01", poster_path: null, job: "Director" },
];

// Fincher: user logged 10,11,12; 13 is a gap, 14 is DISMISSED.
export const FINCHER_FILMS = [
  { ...f(10, "Se7en", 1995), job: "Director" },
  { ...f(11, "Fight Club", 1999), job: "Director" },
  { ...f(12, "Zodiac", 2007), job: "Director" },
  { ...f(13, "The Game", 1997, 80), job: "Director" },
  { ...f(14, "Alien 3", 1992, 70), job: "Director" },
];

// Michael Caine: appears in two films the user already logged via Nolan
// (2, 3) plus one gap — exercises the actor shelf with real overlap
// against the director shelf's own candidates, the way it would in a
// real archive.
export const CAINE_FILMS = [
  f(2, "The Prestige", 2006),
  f(3, "Inception", 2010),
  f(30, "The Cider House Rules", 1999, 60),
];

/** Recommendations for a seed — includes a logged film (3) and a
 *  dismissed one (14), which must both be filtered out. */
export const RECS = [f(3, "Inception", 2010), f(14, "Alien 3", 1992), f(20, "The Insider", 1999), f(21, "Heat", 1995)];

/** Decade discover — includes logged film 10. */
export const DECADE_90S = [f(10, "Se7en", 1995), f(22, "Fargo", 1996), f(23, "Rushmore", 1998)];

/** Genre discover, for the thinnest-genre shelf — includes logged film 11
 *  (must be filtered out, same discipline as every other source here). */
export const HORROR_ID = 27;
export const GENRE_MAP = [
  { id: 18, name: "Drama" },
  { id: HORROR_ID, name: "Horror" },
];
export const HORROR_DISCOVER = [f(11, "Fight Club", 1999), f(24, "The Thing", 1982), f(25, "Hereditary", 2018)];

// Toy Story: user logged 40, 41; 42 and 43 are gaps, deliberately listed
// out of chronological order so the shelf's own sort is what puts them
// back in sequence, not the fixture's ordering.
export const TOY_STORY_ID = 10194;
export const TOY_STORY_PARTS = [
  f(41, "Toy Story 2", 1999),
  f(43, "Toy Story 4", 2019, 70),
  f(40, "Toy Story", 1995),
  f(42, "Toy Story 3", 2010, 65),
];

export function stubFetch() {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);
    calls.push(url);
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

    if (url.includes("/search/person")) {
      const q = decodeURIComponent(new URL(url).searchParams.get("query") ?? "");
      if (q === "Christopher Nolan")
        return json({ results: [
          { id: 999, name: "Christopher Nolan", known_for_department: "Acting", popularity: 99 },
          { id: NOLAN_ID, name: "Christopher Nolan", known_for_department: "Directing", popularity: 12 },
        ] });
      if (q === "David Fincher")
        return json({ results: [{ id: FINCHER_ID, name: "David Fincher", known_for_department: "Directing", popularity: 20 }] });
      if (q === "Michael Caine")
        // A directing-department decoy, the actor-side mirror of the Nolan
        // collision above — findTmdbActorId must prefer the Acting entry.
        return json({ results: [
          { id: 8000, name: "Michael Caine", known_for_department: "Directing", popularity: 5 },
          { id: CAINE_ID, name: "Michael Caine", known_for_department: "Acting", popularity: 40 },
        ] });
      return json({ results: [] });
    }
    if (url.includes(`/person/${NOLAN_ID}/movie_credits`)) return json({ crew: NOLAN_FILMS });
    if (url.includes(`/person/${FINCHER_ID}/movie_credits`)) return json({ crew: FINCHER_FILMS });
    if (url.includes(`/person/${CAINE_ID}/movie_credits`)) return json({ cast: CAINE_FILMS });
    if (url.includes("/recommendations")) return json({ results: RECS });
    if (url.includes("/genre/movie/list")) return json({ genres: GENRE_MAP });
    if (url.includes(`/collection/${TOY_STORY_ID}`))
      return json({ id: TOY_STORY_ID, name: "Toy Story Collection", parts: TOY_STORY_PARTS });
    if (url.includes("/discover/movie")) {
      if (url.includes("with_genres")) return json({ results: HORROR_DISCOVER });
      return json({ results: DECADE_90S });
    }
    return json({ results: [] });
  }) as typeof fetch;
  return calls;
}
