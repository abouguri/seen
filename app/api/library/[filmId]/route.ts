import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";

/** "Remove from library" (§6.5/§9): deletes every entry for this film. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ filmId: string }> },
) {
  const { filmId: filmIdParam } = await params;
  const filmId = Number(filmIdParam);

  if (!Number.isInteger(filmId) || filmId <= 0) {
    return NextResponse.json(
      { error: { code: "invalid_id", message: copy.errors.filmNotFound } },
      { status: 400 },
    );
  }

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

  const { data, error } = await supabase
    .from("watch_entries")
    .delete()
    .eq("film_id", filmId)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: { code: "delete_failed", message: copy.errors.entrySaveFailed } },
      { status: 500 },
    );
  }

  return NextResponse.json({ removed: (data ?? []).length });
}
