import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";

export default async function LibraryPage() {
  const supabase = await createClient();

  const [{ count: viewingCount }, { data: films }] = await Promise.all([
    supabase.from("watch_entries").select("*", { count: "exact", head: true }),
    supabase.from("user_films").select("id"),
  ]);

  const filmCount = films?.length ?? 0;

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-8 md:px-8 md:pt-10">
      <header className="mb-8">
        <h1 className="text-large-title">{copy.library.title}</h1>
        <p className="text-subhead text-label-2 mt-1">
          {filmCount} films · {viewingCount ?? 0} viewings
        </p>
      </header>

      {filmCount === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-body text-label-2 max-w-[32ch] text-center">
            {copy.library.emptyMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}
