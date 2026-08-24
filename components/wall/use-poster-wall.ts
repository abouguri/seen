"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";

const FLUSH_INTERVAL_MS = 400;

type PendingChange = {
  action: "add" | "remove";
  eraLabel: string | null;
  /** What we optimistically set `selected` to when this was queued — lets
   *  a failed revert check whether a newer tap has already superseded it,
   *  instead of blindly clobbering the current (possibly newer) state. */
  optimisticValue: boolean;
};

/**
 * Owns the poster wall's optimistic selection state and the 400ms
 * batched flush to /api/entries?bulk=1 (§6.2). A failed flush reverts
 * only the tiles in that batch — and only if nothing newer has already
 * changed them — never the whole session, and the queue is never
 * silently dropped without surfacing a toast.
 */
export function usePosterWall() {
  const [selected, setSelected] = useState<Map<number, boolean>>(new Map());
  const queueRef = useRef<Map<number, PendingChange>>(new Map());
  const { showToast } = useToast();

  function mergeSeen(films: { id: number; seen: boolean }[]) {
    setSelected((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const film of films) {
        if (!next.has(film.id)) {
          next.set(film.id, film.seen);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  function toggle(filmId: number, activeYear: number) {
    const wasSelected = selected.get(filmId) ?? false;
    const nowSelected = !wasSelected;

    setSelected((prev) => {
      const next = new Map(prev);
      next.set(filmId, nowSelected);
      return next;
    });

    queueRef.current.set(filmId, {
      action: nowSelected ? "add" : "remove",
      eraLabel: nowSelected ? String(activeYear) : null,
      optimisticValue: nowSelected,
    });

    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      if (queueRef.current.size === 0) return;

      const batch = new Map(queueRef.current);
      queueRef.current.clear();

      const add = [...batch]
        .filter(([, change]) => change.action === "add")
        .map(([filmId, change]) => ({ filmId, eraLabel: change.eraLabel! }));
      const remove = [...batch]
        .filter(([, change]) => change.action === "remove")
        .map(([filmId]) => filmId);

      try {
        const res = await fetch("/api/entries?bulk=1", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ add, remove }),
        });
        if (!res.ok) throw new Error("flush failed");
      } catch {
        setSelected((prev) => {
          const next = new Map(prev);
          for (const [filmId, change] of batch) {
            // Only revert if nothing newer already changed this tile —
            // otherwise a stale revert would clobber a later, in-flight
            // (or already-succeeded) toggle.
            if (next.get(filmId) === change.optimisticValue) {
              next.set(filmId, !change.optimisticValue);
            }
          }
          return next;
        });
        showToast(copy.errors.entrySaveFailed);
      }
    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [showToast]);

  const addedCount = useMemo(
    () => [...selected.values()].filter(Boolean).length,
    [selected],
  );

  return { selected, mergeSeen, toggle, addedCount };
}
