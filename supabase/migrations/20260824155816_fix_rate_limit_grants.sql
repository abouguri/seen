-- Fixes a gap in 20260824153551: REVOKE ... FROM PUBLIC does not remove
-- privileges Supabase's default-privileges setup grants directly to the
-- named anon/authenticated roles on every new function in this schema —
-- those are separate from the PUBLIC pseudo-role grant. Verified live:
-- an anon-keyed request could call tmdb_rate_limit_hit and successfully
-- write rows, letting an unauthenticated client spam or falsify another
-- user's rate-limit counters. Revoking from the named roles explicitly
-- closes that.

revoke execute on function public.tmdb_rate_limit_hit(uuid, text, timestamptz)
  from anon, authenticated;
