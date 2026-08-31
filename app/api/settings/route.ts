import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";

const bodySchema = z.object({ publicStats: z.boolean() });

/**
 * First settings-mutation route in the app (§ ROADMAP.md #9). Uses the
 * user-scoped client, not the admin one — user_settings' own RLS
 * (auth.uid() = user_id) already restricts this to the caller's own row,
 * the same way every other owner-scoped write in this app works.
 */
export async function PATCH(request: Request) {
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

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: copy.errors.entrySaveFailed } },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, public_stats: parsed.data.publicStats, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json(
      { error: { code: "update_failed", message: copy.errors.entrySaveFailed } },
      { status: 500 },
    );
  }

  return NextResponse.json({ publicStats: parsed.data.publicStats });
}
