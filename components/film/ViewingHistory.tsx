"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { LogViewingSheet, type LogViewingInput } from "@/components/film/LogViewingSheet";
import { useToast } from "@/components/ui/Toast";
import { formatWatchedDate } from "@/lib/dates";
import { copy } from "@/lib/copy";
import type { WatchEntry } from "@/lib/types";

type ViewingHistoryProps = {
  filmId: number;
  initialEntries: WatchEntry[];
};

export function ViewingHistory({ filmId, initialEntries }: ViewingHistoryProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const queryKey = ["watch-entries", filmId];

  const { data: entries = [] } = useQuery<WatchEntry[]>({
    queryKey,
    queryFn: async () => queryClient.getQueryData<WatchEntry[]>(queryKey) ?? initialEntries,
    initialData: initialEntries,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (input: LogViewingInput): Promise<WatchEntry> => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filmId, ...input }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? copy.errors.entrySaveFailed);
      }
      return (await res.json()) as WatchEntry;
    },
    onMutate: async (input: LogViewingInput) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WatchEntry[]>(queryKey) ?? [];
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticEntry: WatchEntry = {
        id: optimisticId,
        filmId,
        watchedOn: input.watchedOn,
        precision: input.precision,
        eraLabel: input.eraLabel,
        rating: input.rating,
        note: input.note,
        place: input.place,
        company: input.company,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<WatchEntry[]>(queryKey, [optimisticEntry, ...previous]);
      setSheetOpen(false);
      return { previous, optimisticId };
    },
    onError: (err, _input, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
      showToast(err instanceof Error ? err.message : copy.errors.entrySaveFailed);
    },
    onSuccess: (created, _input, context) => {
      if (!context) return;
      queryClient.setQueryData<WatchEntry[]>(queryKey, (current = []) =>
        current.map((entry) => (entry.id === context.optimisticId ? created : entry)),
      );
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-title-2">{copy.film.yourHistory}</h2>
        <Button onClick={() => setSheetOpen(true)}>{copy.film.logAViewing}</Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-body text-label-2">{copy.film.noHistoryYet}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id} className="border-separator border-b pb-4 last:border-0">
              <div className="flex items-center gap-3">
                <p className="text-headline">{formatWatchedDate(entry)}</p>
                {entry.rating !== null && <Stars value={entry.rating} size={14} />}
              </div>
              {entry.note && <p className="text-body text-label-2 mt-1">{entry.note}</p>}
              {(entry.place || entry.company) && (
                <p className="text-footnote text-label-2 mt-1">
                  {[entry.place, entry.company].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <LogViewingSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={(input) => mutation.mutate(input)}
      />
    </div>
  );
}
