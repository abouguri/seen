-- SEEN — initial schema (AGENT.html §4)
create extension if not exists pgcrypto;

-- Shared metadata cache. TMDB id is the primary key.
create table public.films (
  id             bigint primary key,          -- tmdb_id
  title          text not null,
  original_title text,
  release_year   smallint,
  poster_path    text,
  backdrop_path  text,
  runtime        smallint,
  overview       text,
  directors      text[] default '{}',
  genres         text[] default '{}',
  tmdb_rating    numeric(3,1),
  popularity     real,
  synced_at      timestamptz not null default now()
);

-- One row per viewing. This is the heart of the app.
create table public.watch_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  film_id      bigint not null references public.films(id),
  watched_on   date,                          -- nullable by design
  precision    text not null default 'unknown'
                 check (precision in ('day','month','year','era','unknown')),
  era_label    text,                          -- "as a kid", "university"
  rating       smallint check (rating between 1 and 10),
  note         text,
  place        text,                          -- "cinema", "on a plane"
  company      text,                          -- "with my brother"
  source       text not null default 'manual'
                 check (source in ('manual','poster_wall','import')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on public.watch_entries (user_id, film_id);
create index on public.watch_entries (user_id, watched_on desc nulls last);

create table public.tags (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  name     text not null,
  unique (user_id, name)
);

create table public.entry_tags (
  entry_id uuid references public.watch_entries(id) on delete cascade,
  tag_id   uuid references public.tags(id) on delete cascade,
  primary key (entry_id, tag_id)
);

create table public.imports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source        text not null check (source in ('letterboxd','imdb','csv')),
  row_count     int not null default 0,
  matched_count int not null default 0,
  status        text not null default 'pending'
                  check (status in ('pending','running','done','failed')),
  created_at    timestamptz not null default now()
);

-- Derived view — the library.
-- security_invoker makes the view run with the querying user's own RLS,
-- so it only ever aggregates that user's watch_entries — no ownership
-- check needed at the call site, matching the "RLS gives per-user
-- isolation without an ownership check in every query" goal in §02.
create view public.user_films
  with (security_invoker = true) as
select
  e.user_id,
  f.*,
  count(*)                        as watch_count,
  max(e.watched_on)               as last_watched_on,
  max(e.rating)                   as rating
from public.watch_entries e
join public.films f on f.id = e.film_id
group by e.user_id, f.id;

-- Row Level Security -----------------------------------------------------

alter table public.films         enable row level security;
alter table public.watch_entries enable row level security;
alter table public.tags          enable row level security;
alter table public.entry_tags    enable row level security;
alter table public.imports       enable row level security;

-- films: select-only to authenticated. Writes happen through the service
-- role inside route handlers (service_role bypasses RLS by default).
create policy "films_select_authenticated"
  on public.films for select
  to authenticated
  using (true);

-- watch_entries: full CRUD, owner-scoped.
create policy "watch_entries_select_own"
  on public.watch_entries for select
  using (auth.uid() = user_id);
create policy "watch_entries_insert_own"
  on public.watch_entries for insert
  with check (auth.uid() = user_id);
create policy "watch_entries_update_own"
  on public.watch_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "watch_entries_delete_own"
  on public.watch_entries for delete
  using (auth.uid() = user_id);

-- tags: full CRUD, owner-scoped.
create policy "tags_select_own"
  on public.tags for select
  using (auth.uid() = user_id);
create policy "tags_insert_own"
  on public.tags for insert
  with check (auth.uid() = user_id);
create policy "tags_update_own"
  on public.tags for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "tags_delete_own"
  on public.tags for delete
  using (auth.uid() = user_id);

-- entry_tags has no user_id column (it's a join table), so ownership is
-- expressed by joining to the owning watch_entries row instead.
create policy "entry_tags_select_own"
  on public.entry_tags for select
  using (
    exists (
      select 1 from public.watch_entries e
      where e.id = entry_tags.entry_id and e.user_id = auth.uid()
    )
  );
create policy "entry_tags_insert_own"
  on public.entry_tags for insert
  with check (
    exists (
      select 1 from public.watch_entries e
      where e.id = entry_tags.entry_id and e.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tags t
      where t.id = entry_tags.tag_id and t.user_id = auth.uid()
    )
  );
create policy "entry_tags_delete_own"
  on public.entry_tags for delete
  using (
    exists (
      select 1 from public.watch_entries e
      where e.id = entry_tags.entry_id and e.user_id = auth.uid()
    )
  );

-- imports: full CRUD, owner-scoped.
create policy "imports_select_own"
  on public.imports for select
  using (auth.uid() = user_id);
create policy "imports_insert_own"
  on public.imports for insert
  with check (auth.uid() = user_id);
create policy "imports_update_own"
  on public.imports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "imports_delete_own"
  on public.imports for delete
  using (auth.uid() = user_id);

-- Grants — RLS above is the real gate; these grants let the roles reach
-- the tables at all under the RLS policies.
grant usage on schema public to authenticated;
grant select on public.films to authenticated;
grant select, insert, update, delete on public.watch_entries to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, delete on public.entry_tags to authenticated;
grant select, insert, update, delete on public.imports to authenticated;
grant select on public.user_films to authenticated;
