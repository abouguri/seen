-- M4: "recently added" sort (§6.5) needs when a film was first logged,
-- which the original user_films view (§4) didn't expose. CREATE OR
-- REPLACE is non-destructive — same security_invoker RLS scoping as
-- the original. added_at must come AFTER rating (not before) — Postgres
-- only allows CREATE OR REPLACE VIEW to append new columns at the end;
-- inserting one before an existing column shifts its ordinal position,
-- which Postgres treats as an (disallowed) implicit rename.
create or replace view public.user_films
  with (security_invoker = true) as
select
  e.user_id,
  f.*,
  count(*)                        as watch_count,
  max(e.watched_on)               as last_watched_on,
  max(e.rating)                   as rating,
  min(e.created_at)               as added_at
from public.watch_entries e
join public.films f on f.id = e.film_id
group by e.user_id, f.id;

grant select on public.user_films to authenticated;
