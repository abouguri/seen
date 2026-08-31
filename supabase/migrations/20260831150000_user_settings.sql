-- Per-user preferences, starting with the public-stats opt-in
-- (§ ROADMAP.md #9). Owner-only RLS, no public/anon policy at all — the
-- public stats route never queries this table through a user-scoped
-- client, only through the admin client from a server route, so it
-- doesn't need to be publicly readable to do its job. This keeps the
-- opt-in flag itself exactly as private as everything else structurally.
create table public.user_settings (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  public_stats boolean not null default false,
  updated_at   timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);
create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);
create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.user_settings to authenticated;
