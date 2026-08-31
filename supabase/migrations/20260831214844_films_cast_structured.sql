-- Cast photos: cast_members goes from plain names (text[]) to
-- {id, name, profilePath}[] (jsonb), since TMDB's credits.cast carries a
-- person id and profile_path natively and both were being discarded.
-- Existing rows are wrapped with id/profilePath null via the USING
-- clause — they'll show initials until re-enriched.
--
-- Postgres refuses ALTER COLUMN ... TYPE while a view depends on the
-- column, so user_films has to be dropped first and recreated after,
-- same discipline as the two migrations before this one.
drop view public.user_films;

-- ALTER COLUMN ... TYPE's USING clause can't contain a subquery, so this
-- happens in two steps: a plain to_jsonb() cast to an array-of-strings
-- first (a simple expression), then an UPDATE to reshape each row's
-- array into {id, name, profilePath} objects.
alter table public.films
  alter column cast_members drop default;

alter table public.films
  alter column cast_members type jsonb
  using to_jsonb(cast_members);

update public.films
set cast_members = (
  select coalesce(
    jsonb_agg(jsonb_build_object('id', null, 'name', elem, 'profilePath', null)),
    '[]'::jsonb
  )
  from jsonb_array_elements_text(cast_members) as elem
)
where cast_members is not null;

alter table public.films
  alter column cast_members set default '[]'::jsonb;

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
