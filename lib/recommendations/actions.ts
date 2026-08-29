"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * "Not for me". A dismissal is a preference, so it is written to the
 * database rather than held in component state — the brief's requirement
 * is that a dismissed film never returns as the lead, and that has to
 * survive a reload.
 *
 * revalidatePath("/") is what closes the loop: the homepage reads the
 * dismissal set on every render, so dropping its cache entry is enough
 * to make the next render pick a different lead. No cache tag to keep in
 * sync, because the expensive half (TMDB) is cached separately and is
 * not user-specific.
 *
 * Upsert rather than insert: dismissing the same film twice is a
 * double-click, not an error worth surfacing.
 */
export async function dismissRecommendation(filmId: number): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("dismissed_recommendations")
    .upsert({ user_id: user.id, film_id: filmId }, { onConflict: "user_id,film_id" });

  revalidatePath("/");
}
