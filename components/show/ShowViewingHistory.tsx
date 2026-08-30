"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { LogViewingSheet, type LogViewingInput } from "@/components/film/LogViewingSheet";
import { useToast } from "@/components/ui/Toast";
import { formatWatchedDate } from "@/lib/dates";
import { copy } from "@/lib/copy";
import type { ShowWatchEntry } from "@/lib/types";

type ShowViewingHistoryProps = {
  showId: number;
  initialEntries: ShowWatchEntry[];
};

/**
 * Mirrors components/film/ViewingHistory.tsx exactly — same optimistic
 * create/edit/delete pattern against /api/show-entries instead of
 * /api/entries. No tags (show tagging is out of scope for now):
 * LogViewingSheet's tags section is hidden via showTags={false}.
 */
export function ShowViewingHistory({ showId, initialEntries }: ShowViewingHistoryProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ShowWatchEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ShowWatchEntry | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const queryKey = ["show-watch-entries", showId];

  const { data: entries = [] } = useQuery<ShowWatchEntry[]>({
    queryKey,
    queryFn: async () => queryClient.getQueryData<ShowWatchEntry[]>(queryKey) ?? initialEntries,
    initialData: initialEntries,
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: async (input: LogViewingInput): Promise<ShowWatchEntry> => {
      const res = await fetch("/api/show-entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          showId,
          watchedOn: input.watchedOn,
          precision: input.precision,
          eraLabel: input.eraLabel,
          rating: input.rating,
          note: input.note,
          place: input.place,
          company: input.company,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? copy.errors.entrySaveFailed);
      }
      return (await res.json()) as ShowWatchEntry;
    },
    onMutate: async (input: LogViewingInput) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShowWatchEntry[]>(queryKey) ?? [];
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticEntry: ShowWatchEntry = {
        id: optimisticId,
        showId,
        watchedOn: input.watchedOn,
        precision: input.precision,
        eraLabel: input.eraLabel,
        rating: input.rating,
        note: input.note,
        place: input.place,
        company: input.company,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ShowWatchEntry[]>(queryKey, [optimisticEntry, ...previous]);
      setSheetOpen(false);
      return { previous, optimisticId };
    },
    onError: (err, _input, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
      showToast(err instanceof Error ? err.message : copy.errors.entrySaveFailed);
    },
    onSuccess: (created, _input, context) => {
      if (!context) return;
      queryClient.setQueryData<ShowWatchEntry[]>(queryKey, (current = []) =>
        current.map((entry) => (entry.id === context.optimisticId ? created : entry)),
      );
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: LogViewingInput }): Promise<ShowWatchEntry> => {
      const res = await fetch(`/api/show-entries/${id}`, {
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
      return (await res.json()) as ShowWatchEntry;
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShowWatchEntry[]>(queryKey) ?? [];
      queryClient.setQueryData<ShowWatchEntry[]>(queryKey, (current = []) =>
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
      queryClient.setQueryData<ShowWatchEntry[]>(queryKey, (current = []) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/show-entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(copy.errors.entrySaveFailed);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShowWatchEntry[]>(queryKey) ?? [];
      queryClient.setQueryData<ShowWatchEntry[]>(
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-display-2">{copy.film.yourHistory}</h2>
        <Button onClick={() => setSheetOpen(true)} className="shrink-0">
          {copy.film.logAnother}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-body text-label-2">{copy.film.noHistoryYet}</p>
      ) : (
        // Same timeline as ViewingHistory — see the note there for why
        // this isn't a list of cards. Duplicated rather than extracted:
        // the two differ in what an entry *has* (shows carry no tags),
        // and this presentation is 30 lines of markup, not logic.
        <ul className="relative flex flex-col pl-5.5">
          <span
            aria-hidden="true"
            className="bg-separator-strong absolute top-1.5 bottom-3.5 left-1 w-0.5 rounded-full"
          />
          {entries.map((entry, index) => (
            <li key={entry.id} className="group relative flex items-start gap-2 pb-5.5 last:pb-0">
              <span
                aria-hidden="true"
                className={clsx(
                  "ring-surface-1 absolute top-1.5 -left-5.5 h-2.75 w-2.75 rounded-full ring-4",
                  index === 0
                    ? "bg-accent"
                    : index === entries.length - 1
                      ? "bg-warm"
                      : "bg-accent-text",
                )}
              />
              <button
                type="button"
                onClick={() => setEditingEntry(entry)}
                className="min-w-0 flex-1 rounded-xs text-left outline-offset-2"
              >
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <p className="text-subhead font-extrabold">{formatWatchedDate(entry)}</p>
                  {entry.rating !== null && <Stars value={entry.rating} size={13} />}
                </div>
                {entry.note && (
                  <p className="text-label mt-2 text-[1.1875rem] leading-snug">
                    {entry.note}
                  </p>
                )}
                {(entry.place || entry.company) && (
                  <p className="text-footnote text-label-2 mt-1.5">
                    {[entry.place, entry.company].filter(Boolean).join(" · ")}
                  </p>
                )}
              </button>
              <Button
                variant="icon-danger"
                onClick={() => setDeletingEntry(entry)}
                aria-label={copy.film.deleteViewing}
                className="shrink-0"
              >
                <Trash2 size={16} strokeWidth={2} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <LogViewingSheet
        key="create"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={(input) => createMutation.mutate(input)}
        showTags={false}
      />

      {editingEntry && (
        <LogViewingSheet
          key={editingEntry.id}
          open={Boolean(editingEntry)}
          initialEntry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSubmit={(input) => editMutation.mutate({ id: editingEntry.id, input })}
          showTags={false}
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
