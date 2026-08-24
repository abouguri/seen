import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves tag names to ids for this user (creating any that don't exist
 * yet via the (user_id, name) unique constraint), then replaces the full
 * tag set on the given entry — the sheet always submits the final list,
 * not a diff, so delete-then-insert is simpler and correct.
 */
export async function setEntryTags(
  supabase: SupabaseClient,
  entryId: string,
  userId: string,
  tagNames: string[],
): Promise<string[]> {
  const cleaned = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];

  if (cleaned.length === 0) {
    await supabase.from("entry_tags").delete().eq("entry_id", entryId);
    return [];
  }

  const { data: tagRows, error: upsertError } = await supabase
    .from("tags")
    .upsert(
      cleaned.map((name) => ({ user_id: userId, name })),
      { onConflict: "user_id,name" },
    )
    .select("id, name");

  if (upsertError || !tagRows) throw new Error("tag_resolve_failed");

  await supabase.from("entry_tags").delete().eq("entry_id", entryId);

  const { error: insertError } = await supabase
    .from("entry_tags")
    .insert(tagRows.map((t) => ({ entry_id: entryId, tag_id: t.id })));

  if (insertError) throw new Error("tag_attach_failed");

  return tagRows.map((t) => t.name);
}

/** Batch-fetches tags for several entries at once (film detail's history list). */
export async function getEntryTags(
  supabase: SupabaseClient,
  entryIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (entryIds.length === 0) return map;

  const { data } = await supabase
    .from("entry_tags")
    .select("entry_id, tags(name)")
    .in("entry_id", entryIds);

  for (const row of data ?? []) {
    const name = (row.tags as unknown as { name: string } | null)?.name;
    if (!name) continue;
    const list = map.get(row.entry_id) ?? [];
    list.push(name);
    map.set(row.entry_id, list);
  }
  return map;
}
