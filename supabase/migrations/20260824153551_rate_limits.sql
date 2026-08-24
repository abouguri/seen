-- Server-side rate limiting for the TMDB proxy routes (§8/M2 security
-- requirement). Deliberately not part of §4's schema — this is
-- infrastructure bookkeeping, not product data, and is never exposed
-- through PostgREST to anon/authenticated clients: RLS is enabled with
-- no policies (default deny), and the increment function is callable
-- only by service_role from within our own route handlers.

create table public.tmdb_rate_limits (
  user_id       uuid not null references auth.users(id) on delete cascade,
  route         text not null,
  window_start  timestamptz not null,
  request_count int not null default 0,
  primary key (user_id, route, window_start)
);

alter table public.tmdb_rate_limits enable row level security;
-- No policies created — default deny for anon/authenticated. Only
-- service_role (which bypasses RLS) can touch this table.

create or replace function public.tmdb_rate_limit_hit(
  p_user_id uuid,
  p_route text,
  p_window_start timestamptz
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Opportunistic cleanup of old buckets so this table doesn't grow
  -- unbounded — cheap, and piggybacks on a call that's happening anyway.
  delete from public.tmdb_rate_limits
  where window_start < now() - interval '1 hour';

  insert into public.tmdb_rate_limits (user_id, route, window_start, request_count)
  values (p_user_id, p_route, p_window_start, 1)
  on conflict (user_id, route, window_start)
  do update set request_count = tmdb_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count;
end;
$$;

revoke all on function public.tmdb_rate_limit_hit(uuid, text, timestamptz) from public;
grant execute on function public.tmdb_rate_limit_hit(uuid, text, timestamptz) to service_role;
