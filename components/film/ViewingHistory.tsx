"use client";

import { useState } from "react";
import Link from "next/link";
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-display-2">{copy.film.yourHistory}</h2>
        <Button onClick={() => setSheetOpen(true)} className="shrink-0">
          {copy.film.logAnother}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-body text-label-2">{copy.film.noHistoryYet}</p>
      ) : (
        // A timeline, not a list of cards (SEEN Redesign): a continuous
        // spine with a node per viewing. The point of this screen is
        // that a film has been watched more than once over years, and a
        // stack of equal-weight bordered rows says the opposite. The
        // spine is decorative — the entries are still a real <ul>, and
        // each node's date is still its heading.
        <ul className="relative flex flex-col pl-5.5">
          <span
            aria-hidden="true"
            className="bg-separator-strong absolute top-1.5 bottom-3.5 left-1 w-0.5 rounded-full"
          />
          {entries.map((entry, index) => (
            <li key={entry.id} className="group relative flex items-start gap-2 pb-5.5 last:pb-0">
              {/* The newest viewing takes the accent, the oldest the
                  warm secondary, everything between the muted tint —
                  so a long history reads as a gradient through time
                  rather than a column of identical dots. */}
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
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setEditingEntry(entry)}
                  className="w-full rounded-xs text-left outline-offset-2"
                >
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <p className="text-subhead font-extrabold">{formatWatchedDate(entry)}</p>
                    {entry.rating !== null && <Stars value={entry.rating} size={13} />}
                  </div>
                  {entry.note && (
                    // The note is the one piece of a viewing you actually
                    // wrote, so it's set larger and in the full label
                    // colour while the metadata around it stays muted.
                    // It used to take the display face too, but that only
                    // worked while the display face was a serif — Helvetica
                    // beside Manrope at 19px reads as a mistake, not as a
                    // second voice.
                    <p className="text-label mt-2 text-[1.1875rem] leading-snug">
                      {entry.note}
                    </p>
                  )}
                  {entry.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-caption bg-accent-dim text-accent-text rounded-xs px-2 py-1 font-extrabold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                {/* A sibling of the edit button, not a child of it — a
                    Link can't nest inside a <button> (LibraryTile.tsx's
                    quick-log button documents the same constraint). */}
                {(entry.place || entry.company) && (
                  <p className="text-footnote text-label-2 mt-1.5">
                    {entry.place}
                    {entry.place && entry.company && " · "}
                    {entry.company && (
                      <Link
                        href={`/with/${encodeURIComponent(entry.company)}`}
                        className="rounded-xs outline-offset-2 hover:underline"
                      >
                        {entry.company}
                      </Link>
                    )}
                  </p>
                )}
              </div>
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
