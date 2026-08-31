import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnThisDayEntry } from "@/lib/types";

const MAX_ENTRIES = 3;

type MovieOnThisDayRow = {
  watched_on: string | null;
  note: string | null;
  films: { id: number; title: string; poster_path: string | null } | null;
};

type ShowOnThisDayRow = {
  watched_on: string | null;
  note: string | null;
  shows: { id: number; name: string; poster_path: string | null } | null;
};

/**
 * "On this day" (§ ROADMAP.md #6) — past viewings that happened on
 * today's month/day, any prior year. Filtered to precision:'day' only:
 * a year- or era-precision watchedOn is a placeholder date (LogViewingSheet
 * writes "YYYY-01-01" for year precision), not a real one, and claiming
 * "you watched this on this day" from a placeholder would violate the
 * app's own standard that every claim is true and checkable.
 */
export async function getOnThisDayEntries(
  supabase: SupabaseClient,
  userId: string,
): Promise<OnThisDayEntry[]> {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const currentYear = today.getFullYear();

  const [moviesResult, showsResult] = await Promise.all([
    supabase
      .from("watch_entries")
      .select("watched_on, note, films(id, title, poster_path)")
      .eq("user_id", userId)
      .eq("precision", "day")
      .not("watched_on", "is", null),
    supabase
      .from("show_watch_entries")
      .select("watched_on, note, shows(id, name, poster_path)")
      .eq("user_id", userId)
      .eq("precision", "day")
      .not("watched_on", "is", null),
  ]);

  const matchesToday = (watchedOn: string) => {
    const [yearStr, monthStr, dayStr] = watchedOn.split("-");
    return Number(monthStr) === month && Number(dayStr) === day && Number(yearStr) < currentYear;
  };

  const movieRows = (moviesResult.data ?? []) as unknown as MovieOnThisDayRow[];
  const showRows = (showsResult.data ?? []) as unknown as ShowOnThisDayRow[];

  const movies: OnThisDayEntry[] = movieRows
    .filter((row) => row.films !== null && row.watched_on && matchesToday(row.watched_on))
    .map((row) => ({
      mediaType: "movie" as const,
      id: row.films!.id,
      title: row.films!.title,
      posterPath: row.films!.poster_path,
      watchedOn: row.watched_on!,
      note: row.note,
      yearsAgo: currentYear - Number(row.watched_on!.split("-")[0]),
    }));

  const shows: OnThisDayEntry[] = showRows
    .filter((row) => row.shows !== null && row.watched_on && matchesToday(row.watched_on))
    .map((row) => ({
      mediaType: "show" as const,
      id: row.shows!.id,
      title: row.shows!.name,
      posterPath: row.shows!.poster_path,
      watchedOn: row.watched_on!,
      note: row.note,
      yearsAgo: currentYear - Number(row.watched_on!.split("-")[0]),
    }));

  return [...movies, ...shows]
    .sort((a, b) => b.watchedOn.localeCompare(a.watchedOn))
    .slice(0, MAX_ENTRIES);
}
