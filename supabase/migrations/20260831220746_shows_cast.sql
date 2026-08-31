-- Cast for shows, mirroring films.cast_members's structured shape
-- (id/name/profilePath) from the start — a plain new column, not a type
-- migration, so none of the drop/recreate-view work the film-cast
-- migrations needed applies here.
alter table public.shows add column cast_members jsonb not null default '[]'::jsonb;
