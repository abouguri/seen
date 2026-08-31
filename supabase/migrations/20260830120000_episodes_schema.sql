-- Episode-level tracking (§ ROADMAP.md #1). Purely additive: shows/
-- show_watch_entries/user_shows are untouched, and nothing shipped so far
-- references an episode, so nothing else changes shape.
--
-- PK design deviates from show_watch_entries' pattern deliberately: TMDB's
-- /tv/{id}/season/{n} response gives each season and episode its own
-- globally-unique numeric id, same shape as shows.id. Using those ids as
-- primary keys (rather than composite (show_id, season_number) keys) keeps
-- every FK in this chain a single bigint column, consistent with how
-- show_watch_entries.show_id already points at shows.id.

-- Shared metadata cache — one row per (show, season). Populated two ways:
-- cheaply via the seasons[] summary already present in a /tv/{id} response
-- (name, episode_count — no episodes), or fully via a /season/{n} fetch
-- alongside its episodes. Unlike films/shows there's no separate
-- enriched_at: a season row from a full /season/{n} fetch is always
-- complete, there's no partial state to track.
create table public.seasons (
  id             bigint primary key,          -- tmdb season id
  show_id        bigint not null references public.shows(id),
  season_number  smallint not null,
  name           text,
  overview       text,
  poster_path    text,
  air_date       date,
  episode_count  smallint,                    -- checklist's per-season denominator
  synced_at      timestamptz not null default now()
);

create unique index on public.seasons (show_id, season_number);

-- Shared metadata cache — one row per episode, always ingested whole from
-- a /season/{n} response. show_id and season_number are denormalized off
-- seasons/episodes purely for read-time convenience on episode_watch_entries
-- below — see the note there.
create table public.episodes (
  id              bigint primary key,          -- tmdb episode id
  season_id       bigint not null references public.seasons(id),
  show_id         bigint not null references public.shows(id),
  season_number   smallint not null,
  episode_number  smallint not null,
  name            text,
  overview        text,
  air_date        date,
  still_path      text,
  runtime         smallint,                    -- minutes; nullable like films.runtime
  synced_at       timestamptz not null default now()
);

create unique index on public.episodes (show_id, season_number, episode_number);
create index on public.episodes (season_id);

-- One row per viewing, at episode granularity — mirrors show_watch_entries
-- exactly, "episode" in place of "show", plus two denormalized columns:
-- show_id and season_number. Without them, "which episodes has this user
-- seen for show X" and a per-season "5/8" subtotal would need a join
-- through episodes/seasons on every read; both values are already known
-- client-side at write time (the client just fetched the season the
-- episode belongs to), so storing them directly costs nothing.
create table public.episode_watch_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  show_id       bigint not null references public.shows(id),
  season_number smallint not null,
  episode_id    bigint not null references public.episodes(id),
  watched_on    date,
  precision     text not null default 'unknown'
                  check (precision in ('day','month','year','era','unknown')),
  era_label     text,
  rating        smallint check (rating between 1 and 10),
  note          text,
  place         text,
  company       text,
  source        text not null default 'manual'
                  check (source in ('manual','poster_wall','import')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on public.episode_watch_entries (user_id, show_id);
create index on public.episode_watch_entries (user_id, episode_id);
create index on public.episode_watch_entries (user_id, watched_on desc nulls last);

-- Same idempotency backstop as show_watch_entries_poster_wall_unique, kept
-- for parity even though no entry point populates source='poster_wall'
-- here yet — per-episode logging from the poster wall would require a
-- synchronous TMDB fetch before a single tap could register, which breaks
-- its instant-optimistic model, so episode logging has its own entry point.
create unique index episode_watch_entries_poster_wall_unique
  on public.episode_watch_entries (user_id, episode_id)
  where source = 'poster_wall';

-- Row Level Security -----------------------------------------------------

alter table public.seasons enable row level security;
alter table public.episodes enable row level security;
alter table public.episode_watch_entries enable row level security;

-- seasons/episodes: select-only to authenticated. Writes go through the
-- service role inside route handlers, same as shows/films.
create policy "seasons_select_authenticated"
  on public.seasons for select
  to authenticated
  using (true);

create policy "episodes_select_authenticated"
  on public.episodes for select
  to authenticated
  using (true);

-- episode_watch_entries: full CRUD, owner-scoped.
create policy "episode_watch_entries_select_own"
  on public.episode_watch_entries for select
  using (auth.uid() = user_id);
create policy "episode_watch_entries_insert_own"
  on public.episode_watch_entries for insert
  with check (auth.uid() = user_id);
create policy "episode_watch_entries_update_own"
  on public.episode_watch_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "episode_watch_entries_delete_own"
  on public.episode_watch_entries for delete
  using (auth.uid() = user_id);

-- Grants — schema usage was already granted in the init migration.
grant select on public.seasons to authenticated;
grant select on public.episodes to authenticated;
grant select, insert, update, delete on public.episode_watch_entries to authenticated;
