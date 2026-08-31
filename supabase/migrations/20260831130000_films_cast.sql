-- Cast, for the film detail view and people pages (§ ROADMAP.md #4/#5).
-- credits.cast already arrives on the existing detail fetch
-- (append_to_response=credits) and was simply discarded until now.
--
-- Named cast_members, not cast: `cast` is a reserved word in PostgreSQL
-- (CAST(x AS type)), which would force every query to quote it.
alter table public.films add column cast_members text[] default '{}';
