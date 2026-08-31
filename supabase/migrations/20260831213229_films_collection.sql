-- Franchise data, for the "Complete the franchise" homepage shelf.
-- belongs_to_collection is native to the base /movie/{id} response (no
-- append_to_response needed, unlike credits) and was simply discarded
-- until now, same story as cast_members before it.
alter table public.films add column collection_id integer;
alter table public.films add column collection_name text;

-- Recreate user_films (drop + create, not CREATE OR REPLACE) so these two
-- new columns are visible to it immediately, rather than silently missing
-- the way cast_members was until 20260831211525 caught up to it. Drop +
-- create rather than replace for the same reason that migration needed
-- to: CREATE OR REPLACE VIEW refuses when accumulated f.* columns shift
-- the ordinal position of the view's own trailing columns. No other
-- schema object depends on user_films.
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
