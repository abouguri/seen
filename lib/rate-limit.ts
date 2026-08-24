import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed 60s-window rate limiter, backed by the tmdb_rate_limits table
 * (see migration 20260824153551). Every /api/tmdb/* route calls this
 * per-user before touching TMDB — an unauthenticated or unlimited proxy
 * to a paid API key is an open door.
 */
export async function checkRateLimit(
  userId: string,
  route: string,
  limit: number,
): Promise<{ allowed: boolean }> {
  const windowMs = 60_000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("tmdb_rate_limit_hit", {
    p_user_id: userId,
    p_route: route,
    p_window_start: windowStart,
  });

  if (error) {
    // Fail closed on infra errors would take the whole feature down over
    // a transient blip; fail open but this is the one place a bug here
    // would silently disable rate limiting, so keep this function small.
    console.error("rate limit check failed", error);
    return { allowed: true };
  }

  return { allowed: (data as number) <= limit };
}
