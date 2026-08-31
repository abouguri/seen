-- Two columns landed on films after this view's last CREATE OR REPLACE
-- (enriched_at, then the Cast migration's cast_members), and a view's
-- `f.*` expansion is frozen at replace time in Postgres — new base-table
-- columns don't appear in the view until it's redefined. enriched_at
-- lands *before* the view's own trailing `watch_count`/etc. columns in
-- table order, which shifts their ordinal position — Postgres treats that
-- shift as an implicit rename and CREATE OR REPLACE VIEW refuses it, so
-- this drops and recreates instead. Nothing else in the schema is built
-- on top of user_films (checked: no other view or function references
-- it), so the drop is safe. Needed for the recommendation engine's
-- "Complete the actor" shelf, which reads cast through user_films via
-- loadArchive().
drop view public.user_films;

create view public.user_films
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
