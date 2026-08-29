-- Recommendations the user has said "not for me" to.
--
-- A dismissal is a real preference signal, not a UI nicety: the brief is
-- that a dismissed film never returns as the lead, which means it has to
-- outlive the request that produced it. It is stored per user and per
-- film, and the whole set is read on every homepage render to subtract
-- from the candidate pool.
--
-- No reference to public.films. A recommendation is generated from TMDB
-- and the user can dismiss it before it has ever been cached locally, so
-- an FK here would fail on exactly the films most worth dismissing. The
-- id is a TMDB movie id either way.
create table public.dismissed_recommendations (
  user_id    uuid not null references auth.users(id) on delete cascade,
  film_id    bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, film_id)
);

-- The homepage reads every dismissal for one user on each render, which
-- the primary key already serves (user_id is its leading column).

alter table public.dismissed_recommendations enable row level security;

-- Owner-scoped, and deliberately including delete: "not for me" needs to
-- be undoable, and a dismissal the user can't lift is a trap.
create policy "dismissed_recommendations_select_own"
  on public.dismissed_recommendations for select
  using (auth.uid() = user_id);
create policy "dismissed_recommendations_insert_own"
  on public.dismissed_recommendations for insert
  with check (auth.uid() = user_id);
create policy "dismissed_recommendations_delete_own"
  on public.dismissed_recommendations for delete
  using (auth.uid() = user_id);
