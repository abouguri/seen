"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { EpisodeProgressBadge } from "@/components/show/EpisodeProgressBadge";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";
import type { EpisodeWatchEntry, SeasonDetail, SeasonSummary } from "@/lib/types";

type SeasonChecklistProps = {
  showId: number;
  initialSeasons: SeasonSummary[];
  initialEntries: EpisodeWatchEntry[];
};

type EpisodeRef = { episodeId: number; seasonNumber: number };

/**
 * The season/episode tracking entry point (§ ROADMAP.md #1) — deliberately
 * separate from the poster wall: an episode's existence has to be
 * established via a TMDB /season/{n} fetch (see the on-demand query in
 * SeasonRow below) before a watch entry can be inserted at all
 * (episode_watch_entries.episode_id FKs to episodes), which the wall's
 * zero-network-before-tap model can't accommodate. This is bulk-progress
 * UI across dozens of rows, so a tap here is a minimal "mark seen" — not
 * the full rating/note LogViewingSheet a whole-show viewing gets.
 */
export function SeasonChecklist({ showId, initialSeasons, initialEntries }: SeasonChecklistProps) {
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const entriesKey = ["episode-watch-entries", showId];

  const { data: entries = [] } = useQuery<EpisodeWatchEntry[]>({
    queryKey: entriesKey,
    queryFn: async () => queryClient.getQueryData<EpisodeWatchEntry[]>(entriesKey) ?? initialEntries,
    initialData: initialEntries,
    staleTime: Infinity,
  });

  const entryByEpisodeId = new Map(entries.map((entry) => [entry.episodeId, entry]));

  const markSeenMutation = useMutation({
    mutationFn: async (episode: EpisodeRef): Promise<EpisodeWatchEntry> => {
      const res = await fetch("/api/episode-entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          episodeId: episode.episodeId,
          showId,
          seasonNumber: episode.seasonNumber,
        }),
      });
      if (!res.ok) throw new Error(copy.episodes.toggleFailed);
      return (await res.json()) as EpisodeWatchEntry;
    },
    onMutate: async (episode: EpisodeRef) => {
      await queryClient.cancelQueries({ queryKey: entriesKey });
      const previous = queryClient.getQueryData<EpisodeWatchEntry[]>(entriesKey) ?? [];
      const optimisticId = `optimistic-${episode.episodeId}`;
      const optimisticEntry: EpisodeWatchEntry = {
        id: optimisticId,
        showId,
        seasonNumber: episode.seasonNumber,
        episodeId: episode.episodeId,
        watchedOn: null,
        precision: "unknown",
        eraLabel: null,
        rating: null,
        note: null,
        place: null,
        company: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<EpisodeWatchEntry[]>(entriesKey, [...previous, optimisticEntry]);
      return { previous, optimisticId };
    },
    onError: (_err, _episode, context) => {
      if (context) queryClient.setQueryData(entriesKey, context.previous);
      showToast(copy.episodes.toggleFailed);
    },
    onSuccess: (created, _episode, context) => {
      if (!context) return;
      queryClient.setQueryData<EpisodeWatchEntry[]>(entriesKey, (current = []) =>
        current.map((entry) => (entry.id === context.optimisticId ? created : entry)),
      );
    },
  });

  const markUnseenMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`/api/episode-entries/${entryId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(copy.episodes.toggleFailed);
    },
    onMutate: async (entryId: string) => {
      await queryClient.cancelQueries({ queryKey: entriesKey });
      const previous = queryClient.getQueryData<EpisodeWatchEntry[]>(entriesKey) ?? [];
      queryClient.setQueryData<EpisodeWatchEntry[]>(
        entriesKey,
        previous.filter((entry) => entry.id !== entryId),
      );
      return { previous };
    },
    onError: (_err, _entryId, context) => {
      if (context) queryClient.setQueryData(entriesKey, context.previous);
      showToast(copy.episodes.toggleFailed);
    },
  });

  function toggleEpisode(episode: EpisodeRef) {
    const existing = entryByEpisodeId.get(episode.episodeId);
    if (existing) {
      markUnseenMutation.mutate(existing.id);
    } else {
      markSeenMutation.mutate(episode);
    }
  }

  const sortedSeasons = [...initialSeasons].sort((a, b) => a.seasonNumber - b.seasonNumber);
  if (sortedSeasons.length === 0) return null;

  const aggregate = sortedSeasons
    .filter((season) => season.seasonNumber !== 0)
    .reduce(
      (acc, season) => {
        const total = season.episodeCount ?? 0;
        const seen = entries.filter((entry) => entry.seasonNumber === season.seasonNumber).length;
        return { seen: acc.seen + Math.min(seen, total), total: acc.total + total };
      },
      { seen: 0, total: 0 },
    );

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-display-2">{copy.episodes.heading}</h2>
        <EpisodeProgressBadge seenCount={aggregate.seen} totalCount={aggregate.total} />
      </div>

      <ul className="flex flex-col gap-2">
        {sortedSeasons.map((season) => (
          <SeasonRow
            key={season.id}
            showId={showId}
            season={season}
            seenCount={entries.filter((entry) => entry.seasonNumber === season.seasonNumber).length}
            open={openSeasons.has(season.seasonNumber)}
            onToggleOpen={(open) =>
              setOpenSeasons((prev) => {
                const next = new Set(prev);
                if (open) next.add(season.seasonNumber);
                else next.delete(season.seasonNumber);
                return next;
              })
            }
            entryByEpisodeId={entryByEpisodeId}
            onToggleEpisode={toggleEpisode}
          />
        ))}
      </ul>
    </div>
  );
}

function SeasonRow({
  showId,
  season,
  seenCount,
  open,
  onToggleOpen,
  entryByEpisodeId,
  onToggleEpisode,
}: {
  showId: number;
  season: SeasonSummary;
  seenCount: number;
  open: boolean;
  onToggleOpen: (open: boolean) => void;
  entryByEpisodeId: Map<number, EpisodeWatchEntry>;
  onToggleEpisode: (episode: EpisodeRef) => void;
}) {
  // Fetched once per season per page load — episode lists are large, so
  // they're never part of the show page's initial SSR payload, only
  // pulled in on expand (and cached server-side from then on, see
  // lib/tmdb/get-season-detail.ts).
  const { data, isLoading, isError } = useQuery<SeasonDetail>({
    queryKey: ["season-detail", showId, season.seasonNumber],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/show/${showId}/season/${season.seasonNumber}`);
      if (!res.ok) throw new Error(copy.episodes.loadFailed);
      return (await res.json()) as SeasonDetail;
    },
    enabled: open,
    staleTime: Infinity,
  });

  const total = season.episodeCount ?? 0;
  const label =
    season.seasonNumber === 0
      ? copy.episodes.specialsLabel
      : (season.name ?? copy.episodes.seasonLabel(season.seasonNumber));

  return (
    <li className="bg-surface-1 rounded-md">
      <details open={open} onToggle={(event) => onToggleOpen((event.target as HTMLDetailsElement).open)}>
        <summary className="text-body flex cursor-pointer items-center justify-between gap-3 px-4 py-3 outline-offset-2">
          <span className="font-bold">{label}</span>
          <span className="text-footnote text-label-2">
            {copy.episodes.progress(Math.min(seenCount, total), total)}
          </span>
        </summary>

        <div className="border-separator flex flex-col gap-1 border-t px-4 py-3">
          {isLoading && (
            <>
              <div className="bg-surface-2 h-10 w-full animate-pulse rounded-md" />
              <div className="bg-surface-2 h-10 w-full animate-pulse rounded-md" />
            </>
          )}
          {isError && <p className="text-footnote text-danger">{copy.episodes.loadFailed}</p>}
          {data?.episodes.map((episode) => {
            const seen = entryByEpisodeId.has(episode.id);
            return (
              <button
                key={episode.id}
                type="button"
                onClick={() =>
                  onToggleEpisode({ episodeId: episode.id, seasonNumber: episode.seasonNumber })
                }
                aria-pressed={seen}
                aria-label={seen ? copy.episodes.markUnseen : copy.episodes.markSeen}
                className="flex items-center gap-3 rounded-xs py-2 text-left outline-offset-2"
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    seen ? "bg-accent border-accent text-on-accent" : "border-separator-strong text-transparent",
                  )}
                >
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="text-body">
                  {episode.episodeNumber}. {episode.name}
                </span>
              </button>
            );
          })}
        </div>
      </details>
    </li>
  );
}
