"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";

const FLUSH_INTERVAL_MS = 400;

export type TileState = {
  selected: boolean;
  /** Can this tile be toggled off? Only true for the wall's own
   *  source='poster_wall' rows — a film seen via a manual/import entry
   *  renders selected but must never be removed by a wall tap (§9): the
   *  wall may only ever delete an entry it created itself. */
  removable: boolean;
};

type PendingChange = {
  action: "add" | "remove";
  eraLabel: string | null;
  /** What we optimistically set this tile to when queued — lets a failed
   *  revert check whether a newer tap has already superseded it, instead
   *  of blindly clobbering the current (possibly newer) state. */
  optimisticValue: TileState;
};

/**
 * Owns the poster wall's optimistic selection state and the 400ms
 * batched flush to /api/entries?bulk=1 (§6.2). A failed flush reverts
 * only the tiles in that batch — and only if nothing newer has already
 * changed them — never the whole session, and the queue is never
 * silently dropped without surfacing a toast.
 */
export function usePosterWall() {
  const [tiles, setTiles] = useState<Map<number, TileState>>(new Map());
  const queueRef = useRef<Map<number, PendingChange>>(new Map());
  const { showToast } = useToast();

  function mergeSeen(films: { id: number; seen: boolean; hasPosterWallEntry: boolean }[]) {
    setTiles((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const film of films) {
        if (!next.has(film.id)) {
          next.set(film.id, { selected: film.seen, removable: film.hasPosterWallEntry });
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  function toggle(filmId: number, activeYear: number) {
    const current = tiles.get(filmId) ?? { selected: false, removable: false };

    // Seen via a manual/import entry, not the wall — tapping is a no-op
    // (§9): the wall never deletes an entry it didn't create.
    if (current.selected && !current.removable) return;

    const next: TileState = current.selected
      ? { selected: false, removable: false }
      : { selected: true, removable: true };

    setTiles((prev) => new Map(prev).set(filmId, next));

    queueRef.current.set(filmId, {
      action: next.selected ? "add" : "remove",
      eraLabel: next.selected ? String(activeYear) : null,
      optimisticValue: next,
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
        setTiles((prev) => {
          const next = new Map(prev);
          for (const [filmId, change] of batch) {
            const current = next.get(filmId);
            // Only revert if nothing newer already changed this tile —
            // otherwise a stale revert would clobber a later, in-flight
            // (or already-succeeded) toggle.
            if (
              current &&
              current.selected === change.optimisticValue.selected &&
              current.removable === change.optimisticValue.removable
            ) {
              next.set(filmId, {
                selected: !change.optimisticValue.selected,
                removable: !change.optimisticValue.selected,
              });
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
    () => [...tiles.values()].filter((t) => t.selected && t.removable).length,
    [tiles],
  );

  return { tiles, mergeSeen, toggle, addedCount };
}
