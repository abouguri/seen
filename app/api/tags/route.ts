import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";

/** All of this user's tag names, for autocomplete in the log-a-viewing sheet. */
export async function GET() {
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

  const { data, error } = await supabase.from("tags").select("name").order("name");

  if (error) {
    return NextResponse.json(
      { error: { code: "query_failed", message: copy.errors.libraryLoadFailed } },
      { status: 500 },
    );
  }

  return NextResponse.json({ tags: (data ?? []).map((row) => row.name) });
}
