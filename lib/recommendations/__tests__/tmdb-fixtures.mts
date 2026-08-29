/** Canned TMDB responses. Every source deliberately returns films the
 *  user has ALREADY LOGGED and films they have DISMISSED, so the dedupe
 *  is actually exercised rather than assumed. */
export const NOLAN_ID = 525;
export const FINCHER_ID = 7467;

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

/** Recommendations for a seed — includes a logged film (3) and a
 *  dismissed one (14), which must both be filtered out. */
export const RECS = [f(3, "Inception", 2010), f(14, "Alien 3", 1992), f(20, "The Insider", 1999), f(21, "Heat", 1995)];

/** Decade discover — includes logged film 10. */
export const DECADE_90S = [f(10, "Se7en", 1995), f(22, "Fargo", 1996), f(23, "Rushmore", 1998)];

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
      return json({ results: [] });
    }
    if (url.includes(`/person/${NOLAN_ID}/movie_credits`)) return json({ crew: NOLAN_FILMS });
    if (url.includes(`/person/${FINCHER_ID}/movie_credits`)) return json({ crew: FINCHER_FILMS });
    if (url.includes("/recommendations")) return json({ results: RECS });
    if (url.includes("/discover/movie")) return json({ results: DECADE_90S });
    return json({ results: [] });
  }) as typeof fetch;
  return calls;
}
