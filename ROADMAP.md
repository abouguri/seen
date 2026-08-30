# Roadmap

What's left to build, and what was deliberately left out.

Sources: a hands-on product review of the live app (30 August 2026), plus
items deferred during implementation. Each entry says what it is, why it
matters, and what it touches — so picking one up doesn't start with
rediscovering the problem.

Ordered roughly by leverage. Nothing here is in progress.

---

## 1. Season and episode tracking for shows

**The biggest gap.** Roughly a fifth of a real library is TV, and every
one of those titles is currently logged exactly like a movie: one "seen
1×" entry, one rating, no notion of a season or an episode. *Breaking
Bad* and a 90-minute film are the same shape of record.

Show-level tracking already exists and works — `shows`,
`show_watch_entries`, `user_shows`, the whole parallel stack. Episodes
were explicitly deferred as a **purely additive** phase: nothing shipped
so far needs to change shape to accommodate them, because nothing shipped
references an episode.

What it needs:

- Migration: `seasons`, `episodes`, `episode_watch_entries`. The last one
  mirrors `show_watch_entries` — owner-scoped RLS, the same partial
  unique index for idempotency.
- `lib/tmdb/`: season and episode fetching (`/tv/{id}/season/{n}`).
  Episode lists are large; they belong in the cache tables, not in a
  per-render fetch.
- `components/show/`: a season checklist, "42 / 62 episodes", and an
  in-progress vs. completed state on the show detail view.
- `lib/stats/compute.ts`: `totalHours` is movie-only today precisely
  because no reliable per-viewing duration exists at show granularity.
  Episodes are what would fix that.

**The constraint that shaped the current design:** per-episode logging
from the poster wall would mean synchronously fetching every season's
episode list from TMDB before a single row can be inserted, which breaks
the instant-optimistic-tap model `components/wall/use-poster-wall.ts` is
built around. Any episode work needs its own entry point, not the wall's.

## 2. One canonical detail view

There are two, and they have drifted. Opening a title from the library
grid gives a slide-over (`components/library/DetailPanel.tsx`); reaching
one by URL gives a full page (`app/(app)/film/[tmdbId]/page.tsx`) with a
different layout — the synopsis is collapsed into an accordion there and
open in the panel, for instance.

Both are legitimate: the panel exists because a full navigation was the
complaint, and the page exists because a title needs a shareable URL.
The problem is that they're maintained separately and diverge. Extract
the shared body into one component that both mount, the way
`LeadCard`/`LeadRecommendation` was split.

## 3. "Remove from library" is undiscoverable

The feature exists and works — right-click or long-press a tile → *Remove
from library* → confirm sheet → `DELETE /api/library/[filmId]`, with
optimistic removal. A product reviewer went looking for it and concluded
it didn't exist.

A context menu is not a discoverable affordance. The fix is a visible
action in the detail panel, next to the viewing history, where someone
looking at a title they want gone is already standing.

Related and genuinely missing: **no way to fix a bad TMDB match.** If Add
matched the wrong film, year or poster, the only remedy is remove and
re-add.

## 4. Cast

Not modelled anywhere. `FilmDetail` carries `directors` and `genres`; the
`films` table has no cast column and `lib/tmdb/cache.ts` never reads
`credits.cast`.

Needs a migration, a change to the enrichment path, and a place to put it
on the detail view. Worth doing alongside #5, since a cast list is only
interesting if the names lead somewhere.

## 5. People pages

Names appear in the detail panel and drive the entire "complete the
director" recommendation shelf, but they aren't links and there's no page
for a person.

`lib/recommendations/engine.ts` already computes "you've seen 5 of
Christopher Nolan's 7" — the logic exists, it's just trapped inside one
shelf on one page. Surfacing it as `/people/[name]`, reachable from any
title, is mostly reuse.

## 6. The data already collected but never shown

The log modal captures more than anything reads back. All three of these
are read-side only — no new capture UI:

- **"Who with" → people pages.** Every viewing can record who you watched
  it with. Nothing aggregates it. "Films watched with my brother" falls
  straight out of `watch_entries.company`.
- **Memory search.** Search matches titles only. The "what do you
  remember" note is the most personal field in the app and is currently
  write-only — there's no way to find "the one where I wrote about the
  library scene". Full-text search over `watch_entries.note`.
- **On this day.** "Three years ago today you watched *Fight Club* — you
  wrote: …" Fits the app's register better than almost anything else on
  this list, and it's a single indexed query.

## 7. Year in review

`lib/stats/compute.ts` already produces the numbers — hours, top
directors, decades. Packaging them as a shareable annual recap is the
closest thing SEEN has to a reason to open it in January.

Depends on #9 (a public share surface) to be shareable at all.

## 8. Mobile pass

Untested at phone widths in any deliberate way. The filter bar, the
poster grid and the slide-over panel were all designed desktop-first and
are dense.

This matters more than its position suggests: logging from a phone right
after watching something is the app's most natural moment, and it's the
one it has been least designed for. Needs a real audit driven at 390px,
not a guess.

## 9. Opt-in public stats page

The numbers are the one part of the archive that's fun to show off
without exposing the memory text. Everything else in SEEN is private by
default and should stay that way — this needs its own explicit opt-in and
its own RLS story, not a loosened policy on an existing table.

## 10. Smaller items

- **Rewatch roulette.** One tap, shuffle across 4–5★ titles, for the "I
  don't know what to rewatch" moment. Cheap — the rating data is there.
- **Photo on a log entry.** The diary already asks *where* and *who
  with*; a ticket stub fits the same register. Needs Supabase Storage and
  a size policy.
- **Show tagging.** Tags are film-only (`showTags={false}` in
  `LogViewingSheet`). Needs a polymorphic `entry_id` on `entry_tags`.
- **TV in import/export.** Letterboxd has no TV concept at all; IMDb's
  `Title Type` column is the way in.
- **`/search/multi`.** The search screen is movie-only. TMDB's multi
  endpoint returns mixed results with a `media_type` discriminator;
  wiring it in touches `resolveFilmSummaries` → `toFilmSummary` →
  `FilmSummary`, which is why it was deferred.

---

## Known-good, despite appearances

Three things a product review flagged as broken that are working as
designed. Recorded here so they don't get "fixed" twice.

- **Tags can be assigned.** `TagInput` is in the log sheet with
  suggestions from `/api/tags`. It's hidden only for TV shows, because
  show tagging doesn't exist yet — a reviewer testing on a series sees no
  tag field and reasonably concludes there isn't one.
- **Titles can be removed.** See #3 — it's discoverability, not absence.
- **The homepage lead action.** It's a link to the film page, not a
  broken button. It used to say "Add to library" while adding nothing;
  it now says "Log a viewing", which is what the destination offers.

## Deliberately not doing

- **Social features.** No followers, no public reviews, no activity feed.
  The archive is private by default and the diary field only works if
  people write honestly in it.
- **A watchlist.** SEEN is a record of what you've seen. "Not a queue of
  things you haven't" is on the sign-in page, and a watchlist would make
  that a lie.
- **Algorithmic recommendations without a reason.** Every recommendation
  carries a visible, auditable one-line reason. If the sentence can't be
  written, the shelf doesn't ship. This is the product's whole
  differentiator against a service whose reasons are partly commercial.
