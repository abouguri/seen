/**
 * The recommender's guarantees, exercised against the real engine with
 * TMDB stubbed at the fetch boundary — so the client's own parsing,
 * filtering and dedupe all run for real, and only the network is fake.
 *
 * The fixtures are built to be hostile on purpose: every TMDB source
 * returns films the user has already logged and films they have
 * dismissed, plus a duplicate credit and a poster-less short. Dedupe is
 * called out in the brief as the #1 bug class here, and a test whose
 * fixtures never contain a duplicate proves nothing about it.
 *
 * Run with:  npm run test:recommendations
 * (tsx for the path aliases; --conditions=react-server so the
 *  `server-only` marker resolves to its empty server build rather than
 *  throwing.)
 */
import { stubFetch, TOY_STORY_ID } from "./tmdb-fixtures.mjs";
const calls = stubFetch();

const { buildRecommendations, THIN_ARCHIVE } = await import("@/lib/recommendations/engine");
import type { Archive, ArchiveFilm } from "@/lib/recommendations/types";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
}

const mk = (o: Partial<ArchiveFilm> & { id: number; title: string }): ArchiveFilm => ({
  year: 2010, posterPath: "/p.jpg", directors: [], genres: [], castMembers: [],
  collectionId: null, collectionName: null, rating: null, lastWatchedOn: null, ...o,
});

const archiveOf = (films: ArchiveFilm[], dismissed: number[] = []): Archive => ({
  films, loggedIds: new Set(films.map(f => f.id)), dismissedIds: new Set(dismissed),
});

const NOLAN = ["Christopher Nolan"], FINCHER = ["David Fincher"], DRAMA = ["Drama"];
const thirty: ArchiveFilm[] = [
  mk({ id: 1, title: "Memento", year: 2000, directors: NOLAN, genres: DRAMA, rating: 9, lastWatchedOn: "2015-03-02" }),
  mk({ id: 2, title: "The Prestige", year: 2006, directors: NOLAN, castMembers: [{ id: null, name: "Michael Caine", profilePath: null }], genres: DRAMA, rating: 8 }),
  mk({ id: 3, title: "Inception", year: 2010, directors: NOLAN, castMembers: [{ id: null, name: "Michael Caine", profilePath: null }], genres: DRAMA, rating: 10, lastWatchedOn: "2024-01-01" }),
  mk({ id: 4, title: "Interstellar", year: 2014, directors: NOLAN, genres: DRAMA, rating: 9 }),
  mk({ id: 5, title: "Dunkirk", year: 2017, directors: NOLAN, genres: DRAMA, rating: 8 }),
  mk({ id: 10, title: "Se7en", year: 1995, directors: FINCHER, genres: DRAMA, rating: 10, lastWatchedOn: "2016-05-05" }),
  mk({ id: 11, title: "Fight Club", year: 1999, directors: FINCHER, genres: DRAMA, rating: 9 }),
  mk({ id: 12, title: "Zodiac", year: 2007, directors: FINCHER, genres: DRAMA, rating: 8 }),
  mk({ id: 40, title: "Toy Story", year: 1995, genres: DRAMA, collectionId: TOY_STORY_ID, collectionName: "Toy Story Collection" }),
  mk({ id: 41, title: "Toy Story 2", year: 1999, genres: DRAMA, collectionId: TOY_STORY_ID, collectionName: "Toy Story Collection" }),
];
// pad to 30 across decades, 2010s heaviest so the 90s read as thinnest.
// The first two fillers are tagged Horror against the rest's Drama, so
// Horror (2) reads as the thinnest genre.
for (let i = 0; i < 20; i++) {
  thirty.push(mk({
    id: 500 + i,
    title: `Filler ${i}`,
    year: i < 18 ? 2010 + (i % 10) : 1990 + i,
    directors: [`Dir ${i}`],
    genres: i < 2 ? ["Horror"] : DRAMA,
  }));
}

console.log("\n=== 0 films ===");
{
  const r = await buildRecommendations(archiveOf([]));
  check("libraryCount is 0", r.libraryCount === 0);
  check("no lead", r.lead === null);
  check("no shelves", r.shelves.length === 0);
  check("made zero TMDB calls", calls.length === 0, `${calls.length} calls`);
}

console.log("\n=== 6 films (thin) ===");
{
  calls.length = 0;
  const six = thirty.slice(0, 6);
  const r = await buildRecommendations(archiveOf(six));
  check("libraryCount is 6", r.libraryCount === 6);
  check("below the thin threshold", 6 < THIN_ARCHIVE);
  check("has a lead", r.lead !== null);
  check("at most one shelf", r.shelves.length <= 1, `${r.shelves.length}`);
  check("no director shelf", !r.shelves.some(s => s.kind === "complete-director"));
  check("no blind-spot shelf", !r.shelves.some(s => s.kind === "blind-spot"));
  const ids = [r.lead?.id, ...r.shelves.flatMap(s => s.items.map(i => i.id))].filter(Boolean);
  check("nothing already logged", !ids.some(id => six.some(f => f.id === id)), JSON.stringify(ids));
}

console.log("\n=== 30 films (full) ===");
{
  const dismissed = [14];
  const arch = archiveOf(thirty, dismissed);
  const r = await buildRecommendations(arch);
  check("libraryCount is 30", r.libraryCount === 30);
  check("has a lead", r.lead !== null);
  console.log(`        lead: ${r.lead?.title} — "${r.lead?.reason}"`);
  check("lead is not in the library", !arch.loggedIds.has(r.lead!.id));
  check("lead is not dismissed", !arch.dismissedIds.has(r.lead!.id));
  check("at most 4 shelves (5 sections with lead)", r.shelves.length <= 4, `${r.shelves.length}`);
  check("no empty shelf", r.shelves.every(s => s.items.length > 0));
  check("every shelf has a reason", r.shelves.every(s => s.reason.trim().length > 0));
  check("every card has a reason", r.shelves.every(s => s.items.every(i => i.reason.trim().length > 0)));

  for (const s of r.shelves) console.log(`        [${s.kind}] ${s.title} — "${s.reason}" (${s.items.length})`);

  const newItems = r.shelves.filter(s => s.kind !== "rewatch").flatMap(s => s.items);
  const leaked = newItems.filter(i => arch.loggedIds.has(i.id));
  check("DEDUPE: no logged film on any non-rewatch shelf", leaked.length === 0,
        JSON.stringify(leaked.map(i => i.title)));
  const dis = [r.lead!, ...r.shelves.flatMap(s => s.items)].filter(i => arch.dismissedIds.has(i.id));
  check("DEDUPE: no dismissed film anywhere", dis.length === 0, JSON.stringify(dis.map(i => i.title)));

  const all = [r.lead!, ...r.shelves.flatMap(s => s.items)].map(i => i.id);
  check("no film appears twice on the page", new Set(all).size === all.length);

  // Position 5+ in the candidate list — MAX_SHELVES=4 means this can
  // lose out to director/actor/franchise/decade-blind-spot even though
  // it has real content, same as seed/rewatch always could. Asserted
  // only when present, same discipline as the rewatch check below.
  const genreShelf = r.shelves.find(s => s.kind === "genre-blind-spot");
  if (genreShelf) {
    check("genre shelf names Horror", genreShelf.title === "Your Horror shelf is thin", genreShelf.title);
    check("genre shelf reason states the count", genreShelf.reason === "Your Horror shelf is the thinnest — 2 films.",
          genreShelf.reason);
    check("genre shelf doesn't re-offer the logged Horror-discover film",
          !genreShelf.items.some(i => i.id === 11));
  }

  const franchiseShelf = r.shelves.find(s => s.kind === "complete-franchise");
  check("franchise shelf exists", franchiseShelf !== undefined, JSON.stringify(r.shelves.map(s => s.kind)));
  if (franchiseShelf) {
    check("franchise shelf names Toy Story Collection",
          franchiseShelf.title === "Complete Toy Story Collection", franchiseShelf.title);
    check("franchise shelf reason states seen/total",
          franchiseShelf.reason === "You've seen 2 of the 4 films in Toy Story Collection.", franchiseShelf.reason);
    check("franchise shelf doesn't re-offer an already-logged Toy Story film",
          !franchiseShelf.items.some(i => i.id === 40 || i.id === 41));
    check("franchise gaps are in chronological order (42 before 43)",
          franchiseShelf.items.map(i => i.id).join(",") === "42,43",
          JSON.stringify(franchiseShelf.items.map(i => i.id)));
  }

  const actorShelf = r.shelves.find(s => s.kind === "complete-actor");
  check("actor shelf exists", actorShelf !== undefined, JSON.stringify(r.shelves.map(s => s.kind)));
  if (actorShelf) {
    check("actor shelf names Michael Caine", actorShelf.title === "Complete Michael Caine",
          actorShelf.title);
    check("actor shelf reason states seen/total", actorShelf.reason === "You've seen 2 of the 3 films Michael Caine has appeared in.",
          actorShelf.reason);
    check("actor shelf's gap is the unlogged Caine film", actorShelf.items.some(i => i.id === 30),
          JSON.stringify(actorShelf.items.map(i => i.id)));
    check("actor shelf doesn't re-offer an already-logged Caine film",
          !actorShelf.items.some(i => i.id === 2 || i.id === 3));
  }

  const rw = r.shelves.find(s => s.kind === "rewatch");
  if (rw) {
    check("rewatch items are all flagged", rw.items.every(i => i.isRewatch === true));
    check("rewatch items ARE in the library", rw.items.every(i => arch.loggedIds.has(i.id)));
  }
  check("poster-less credit was dropped", !all.includes(99));
  check("no film without a poster anywhere",
        [r.lead!, ...r.shelves.flatMap(s => s.items)].every(i => i.posterPath !== null));
}

console.log("\n=== dismissing the lead changes it ===");
{
  const arch1 = archiveOf(thirty);
  const r1 = await buildRecommendations(arch1);
  const arch2 = archiveOf(thirty, [r1.lead!.id]);
  const r2 = await buildRecommendations(arch2);
  check("lead differs after dismissal", r2.lead?.id !== r1.lead?.id, `${r1.lead?.id} -> ${r2.lead?.id}`);
  check("dismissed lead gone from whole page",
        ![r2.lead!, ...r2.shelves.flatMap(s => s.items)].some(i => i.id === r1.lead!.id));
}

console.log(failures === 0 ? "\nALL PASS\n" : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
