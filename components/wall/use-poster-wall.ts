"use client";

import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";
import { queueOfflineChange, getQueuedChanges, clearQueuedChanges } from "@/lib/offline/db";

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
 *
 * Offline (§9): a toggle made with no connection is never reverted — it
 * stays optimistically selected and persists to IndexedDB, then flushes
 * automatically once the browser reports `online` again. Reverting on
 * connectivity loss would be wrong: the user tapped deliberately, and
 * expects it to land once they're back.
 *
 * `kind` selects movie vs show — same optimistic/offline machinery for
 * both (delicate enough that duplicating it risks the two copies
 * drifting), just a different API endpoint and offline-queue namespace.
 * TMDB movie and TV ids are separate namespaces, so the queue key must
 * carry `kind` too, not just the bare id — see lib/offline/db.ts.
 */
export function usePosterWall(kind: "movie" | "show" = "movie") {
  const endpoint = kind === "movie" ? "/api/entries" : "/api/show-entries";
  // Stable per kind (not recreated every render) so it's safe to list as
  // an effect dependency below without resetting the flush interval on
  // every unrelated re-render.
  const queueKey = useCallback((id: number) => `${kind}:${id}`, [kind]);
  const [tiles, setTiles] = useState<Map<number, TileState>>(new Map());
  const [isOffline, setIsOffline] = useState(false);
  const isOfflineRef = useRef(false);
  const queueRef = useRef<Map<number, PendingChange>>(new Map());
  const { showToast } = useToast();

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    isOfflineRef.current = !navigator.onLine;

    // Reapply anything a previous offline session queued but never
    // flushed (e.g. the tab closed before reconnecting), so the UI
    // reflects it immediately instead of looking like the tap "didn't
    // happen" until the retry succeeds.
    getQueuedChanges()
      .then((queued) => {
        const mine = queued.filter((change) => change.mediaType === kind);
        if (mine.length === 0) return;
        setTiles((prev) => {
          const next = new Map(prev);
          for (const change of mine) {
            next.set(change.itemId, {
              selected: change.action === "add",
              removable: change.action === "add",
            });
          }
          return next;
        });
        for (const change of mine) {
          queueRef.current.set(change.itemId, {
            action: change.action,
            eraLabel: change.eraLabel,
            optimisticValue: {
              selected: change.action === "add",
              removable: change.action === "add",
            },
          });
        }
      })
      .catch(() => {});

    function handleOnline() {
      isOfflineRef.current = false;
      setIsOffline(false);
    }
    function handleOffline() {
      isOfflineRef.current = true;
      setIsOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // Mount-once by design — kind is fixed for the lifetime of a mounted
    // wall instance (the Movies/Shows toggle remounts the whole wall via
    // key, it never flips kind on a live instance).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const change = {
      action: (next.selected ? "add" : "remove") as "add" | "remove",
      eraLabel: next.selected ? String(activeYear) : null,
      optimisticValue: next,
    };
    queueRef.current.set(filmId, change);

    if (isOfflineRef.current) {
      queueOfflineChange({
        id: queueKey(filmId),
        mediaType: kind,
        itemId: filmId,
        action: change.action,
        eraLabel: change.eraLabel,
      }).catch(() => {});
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      if (queueRef.current.size === 0) return;
      // Stay queued in IndexedDB until reconnect — no point attempting
      // (and no point treating the inevitable failure as a real error).
      if (isOfflineRef.current) return;

      const batch = new Map(queueRef.current);
      queueRef.current.clear();

      const add = [...batch]
        .filter(([, change]) => change.action === "add")
        .map(([filmId, change]) => ({ filmId, eraLabel: change.eraLabel! }));
      const remove = [...batch]
        .filter(([, change]) => change.action === "remove")
        .map(([filmId]) => filmId);

      try {
        const res = await fetch(`${endpoint}?bulk=1`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            add: add.map(({ filmId, eraLabel }) =>
              kind === "movie" ? { filmId, eraLabel } : { showId: filmId, eraLabel },
            ),
            remove,
          }),
        });
        if (!res.ok) throw new Error("flush failed");
        await clearQueuedChanges([...batch.keys()].map(queueKey)).catch(() => {});
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          // Lost connectivity mid-flush — not a server error. Persist and
          // put the batch back in the queue for the next reconnect,
          // never revert the optimistic state.
          isOfflineRef.current = true;
          setIsOffline(true);
          for (const [filmId, change] of batch) {
            queueOfflineChange({
              id: queueKey(filmId),
              mediaType: kind,
              itemId: filmId,
              action: change.action,
              eraLabel: change.eraLabel,
            }).catch(() => {});
            queueRef.current.set(filmId, change);
          }
          return;
        }

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
  }, [showToast, kind, endpoint, queueKey]);

  const addedCount = useMemo(
    () => [...tiles.values()].filter((t) => t.selected && t.removable).length,
    [tiles],
  );

  return { tiles, mergeSeen, toggle, addedCount, isOffline };
}
