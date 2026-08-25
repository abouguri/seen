-- TV series support (show-level tracking, not per-episode — see the SEEN
-- TV support plan). Fully additive: films/watch_entries/user_films are
-- untouched. TMDB movie ids and TV ids are separate namespaces (the same
-- numeric id can mean two unrelated things), so shows get their own
-- tables rather than sharing films' id space — mirrors §4's films/
-- watch_entries/user_films exactly, "show" in place of "film".

-- Shared metadata cache. TMDB tv id is the primary key.
create table public.shows (
  id                 bigint primary key,          -- tmdb tv id
  name               text not null,
  original_name      text,
  first_air_year     smallint,
  last_air_year      smallint,
  poster_path        text,
  backdrop_path      text,
  overview           text,
  creators           text[] default '{}',         -- TMDB's created_by, not credits.crew
  genres             text[] default '{}',
  tmdb_rating        numeric(3,1),
  popularity         real,
  number_of_seasons  smallint,
  number_of_episodes smallint,
  status             text,                        -- "Returning Series", "Ended", "Canceled", ...
  synced_at          timestamptz not null default now(),
  enriched_at        timestamptz                  -- set once a full /tv/{id} fetch completes
);

-- One row per viewing, at show granularity (a whole show watched, the
-- same fuzzy-date/rating/note model as a film — not per-episode).
create table public.show_watch_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  show_id      bigint not null references public.shows(id),
  watched_on   date,
  precision    text not null default 'unknown'
                 check (precision in ('day','month','year','era','unknown')),
  era_label    text,
  rating       smallint check (rating between 1 and 10),
  note         text,
  place        text,
  company      text,
  source       text not null default 'manual'
                 check (source in ('manual','poster_wall','import')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on public.show_watch_entries (user_id, show_id);
create index on public.show_watch_entries (user_id, watched_on desc nulls last);

-- Same idempotency backstop as watch_entries_poster_wall_unique: at most
-- one poster_wall-sourced row per (user, show). The bulk route pre-checks
-- before inserting; this is defense-in-depth against races.
create unique index show_watch_entries_poster_wall_unique
  on public.show_watch_entries (user_id, show_id)
  where source = 'poster_wall';

-- Derived view — the shows half of the library. Same security_invoker
-- reasoning as user_films: runs with the querying user's own RLS, so it
-- only ever aggregates that user's show_watch_entries.
create view public.user_shows
  with (security_invoker = true) as
select
  e.user_id,
  s.*,
  count(*)                        as watch_count,
  max(e.watched_on)               as last_watched_on,
  max(e.rating)                   as rating,
  min(e.created_at)               as added_at
from public.show_watch_entries e
join public.shows s on s.id = e.show_id
group by e.user_id, s.id;

-- Row Level Security -----------------------------------------------------

alter table public.shows             enable row level security;
alter table public.show_watch_entries enable row level security;

-- shows: select-only to authenticated. Writes go through the service
-- role inside route handlers, same as films.
create policy "shows_select_authenticated"
  on public.shows for select
  to authenticated
  using (true);

-- show_watch_entries: full CRUD, owner-scoped.
create policy "show_watch_entries_select_own"
  on public.show_watch_entries for select
  using (auth.uid() = user_id);
create policy "show_watch_entries_insert_own"
  on public.show_watch_entries for insert
  with check (auth.uid() = user_id);
create policy "show_watch_entries_update_own"
  on public.show_watch_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "show_watch_entries_delete_own"
  on public.show_watch_entries for delete
  using (auth.uid() = user_id);

-- Grants — schema usage was already granted in the init migration.
grant select on public.shows to authenticated;
grant select, insert, update, delete on public.show_watch_entries to authenticated;
grant select on public.user_shows to authenticated;
