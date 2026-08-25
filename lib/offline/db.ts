"use client";

/**
 * Minimal IndexedDB wrapper for the poster wall's offline queue (§9).
 * One record per (mediaType, itemId) pair (a later toggle overwrites an
 * earlier one, same "latest wins" semantics as the in-memory queue), so
 * this only ever holds what still needs to reach the server.
 *
 * `id` must be namespaced by mediaType, not a bare stringified itemId —
 * movie and TV TMDB ids are separate namespaces (the same number can be
 * two unrelated titles), so a movie wall and a show wall toggling the
 * same numeric id offline would silently overwrite each other's queued
 * change under a bare-id key.
 */

const DB_NAME = "seen-offline";
const STORE_NAME = "poster-wall-queue";
const DB_VERSION = 1;

export type QueuedChange = {
  id: string;
  mediaType: "movie" | "show";
  itemId: number;
  action: "add" | "remove";
  eraLabel: string | null;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineChange(change: QueuedChange): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(change);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedChanges(): Promise<QueuedChange[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as QueuedChange[]);
    request.onerror = () => reject(request.error);
  });
}

export async function clearQueuedChanges(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
