-- Fix 3 (post-M5 review): the enrichment queue used "runtime IS NULL" as
-- its "needs a full detail fetch" signal, but some films genuinely have no
-- runtime in TMDB (shorts, some documentaries, incomplete entries) — those
-- got re-fetched by the queue forever. enriched_at is set once a full
-- detail fetch actually completes, regardless of what runtime came back,
-- giving the queue (and the detail-page background refresh) a signal that
-- reflects "have we tried", not "did TMDB happen to have a number".
alter table public.films add column enriched_at timestamptz;
