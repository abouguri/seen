import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { copy } from "@/lib/copy";

/**
 * Deletes the signed-in user's auth account. watch_entries/tags/imports
 * all cascade via their user_id foreign key (§4) — films are a shared
 * cache and are never deleted on user action. Deleting an auth user
 * requires the service role; a user can't do this to themselves via the
 * RLS-scoped client.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: copy.errors.signInRequired } },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "delete_failed", message: copy.errors.entrySaveFailed } },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
