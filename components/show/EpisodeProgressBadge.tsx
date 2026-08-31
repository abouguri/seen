import { copy } from "@/lib/copy";

type EpisodeProgressBadgeProps = {
  seenCount: number;
  totalCount: number;
};

/**
 * Pure function of (seen, total) — "{seen} / {total} episodes" plus a
 * not-started/in-progress/completed state label. Fed the show-wide
 * aggregate from SeasonChecklist (specials excluded from both numbers,
 * matching TMDB's own number_of_episodes convention).
 */
export function EpisodeProgressBadge({ seenCount, totalCount }: EpisodeProgressBadgeProps) {
  if (totalCount === 0) return null;

  const state =
    seenCount === 0
      ? copy.episodes.notStarted
      : seenCount >= totalCount
        ? copy.episodes.completed
        : copy.episodes.inProgress;

  return (
    <div className="flex items-center gap-2">
      <span className="text-subhead font-bold">{copy.episodes.progress(seenCount, totalCount)}</span>
      <span className="text-footnote text-label-2 bg-surface-2 rounded-full px-2.5 py-1">{state}</span>
    </div>
  );
}
