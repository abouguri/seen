"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
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
  const [editingEntry, setEditingEntry] = useState<WatchEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<WatchEntry | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const queryKey = ["watch-entries", filmId];

  const { data: entries = [] } = useQuery<WatchEntry[]>({
    queryKey,
    queryFn: async () => queryClient.getQueryData<WatchEntry[]>(queryKey) ?? initialEntries,
    initialData: initialEntries,
    staleTime: Infinity,
  });

  const createMutation = useMutation({
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
        tags: input.tags,
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

  const editMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: LogViewingInput }): Promise<WatchEntry> => {
      const res = await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? copy.errors.entrySaveFailed);
      }
      return (await res.json()) as WatchEntry;
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WatchEntry[]>(queryKey) ?? [];
      queryClient.setQueryData<WatchEntry[]>(queryKey, (current = []) =>
        current.map((entry) => (entry.id === id ? { ...entry, ...input } : entry)),
      );
      setEditingEntry(null);
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
      showToast(err instanceof Error ? err.message : copy.errors.entrySaveFailed);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<WatchEntry[]>(queryKey, (current = []) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(copy.errors.entrySaveFailed);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WatchEntry[]>(queryKey) ?? [];
      queryClient.setQueryData<WatchEntry[]>(
        queryKey,
        previous.filter((entry) => entry.id !== id),
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
      showToast(err instanceof Error ? err.message : copy.errors.entrySaveFailed);
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
            <li key={entry.id} className="border-separator group flex items-start gap-2 border-b pb-4 last:border-0">
              <button
                type="button"
                onClick={() => setEditingEntry(entry)}
                className="min-w-0 flex-1 text-left"
              >
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
                {entry.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-caption bg-surface-2 text-label-2 rounded-full px-2 py-1"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDeletingEntry(entry)}
                aria-label={copy.film.deleteViewing}
                className="text-danger flex h-11 w-11 shrink-0 items-center justify-center hover:opacity-70"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <LogViewingSheet
        key="create"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={(input) => createMutation.mutate(input)}
      />

      {editingEntry && (
        <LogViewingSheet
          key={editingEntry.id}
          open={Boolean(editingEntry)}
          initialEntry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSubmit={(input) => editMutation.mutate({ id: editingEntry.id, input })}
        />
      )}

      <ConfirmSheet
        open={Boolean(deletingEntry)}
        title={copy.film.deleteViewing}
        body={copy.film.deleteViewingConfirm}
        confirmLabel={copy.film.deleteViewing}
        onConfirm={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}
        onClose={() => setDeletingEntry(null)}
      />
    </div>
  );
}
