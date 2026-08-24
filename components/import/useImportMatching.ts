"use client";

import { useCallback, useRef, useState } from "react";
import type { ImportMatchResult, NormalizedImportRow } from "@/lib/types";

const BATCH_SIZE = 50;

type BatchState = "pending" | "running" | "done" | "error";

/**
 * Drives the match phase in resumable batches (§9: import must be
 * resumable and must never silently lose review decisions on a partial
 * failure). Each batch's outcome is tracked independently — a failed
 * batch stops the run, but every already-matched batch's results stay
 * in state untouched. Retrying re-attempts only the failed batch, then
 * automatically continues with whatever's left.
 */
export function useImportMatching(rows: NormalizedImportRow[]) {
  const batchesRef = useRef<NormalizedImportRow[][]>([]);
  if (batchesRef.current.length === 0 && rows.length > 0) {
    const batches: NormalizedImportRow[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }
    batchesRef.current = batches;
  }
  const batches = batchesRef.current;

  // batches starts empty (rows arrives a render late) and is only ever
  // populated once via the ref above, so the lazy useState initializer
  // would run before it's ready and permanently lock batchStates to [].
  // Resync here instead, the same "adjust state during render" pattern
  // React sanctions for props/derived values that change out from under us.
  const [batchStates, setBatchStates] = useState<BatchState[]>([]);
  if (batchStates.length !== batches.length) {
    setBatchStates(batches.map(() => "pending"));
  }
  const [results, setResults] = useState<ImportMatchResult[]>([]);
  const runningRef = useRef(false);

  async function runBatch(index: number) {
    setBatchStates((prev) => prev.map((s, i) => (i === index ? "running" : s)));
    try {
      const res = await fetch("/api/import/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: batches[index] }),
      });
      if (!res.ok) throw new Error("match batch failed");
      const data = (await res.json()) as { results: ImportMatchResult[] };
      setResults((prev) => [...prev, ...data.results]);
      setBatchStates((prev) => prev.map((s, i) => (i === index ? "done" : s)));
      return true;
    } catch {
      setBatchStates((prev) => prev.map((s, i) => (i === index ? "error" : s)));
      return false;
    }
  }

  const runFrom = useCallback(async (startIndex: number) => {
    if (runningRef.current) return;
    runningRef.current = true;
    for (let i = startIndex; i < batches.length; i++) {
      const ok = await runBatch(i);
      if (!ok) break;
    }
    runningRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  const start = useCallback(() => {
    runFrom(0);
  }, [runFrom]);

  const retryBatch = useCallback(
    (index: number) => {
      runFrom(index);
    },
    [runFrom],
  );

  const doneCount = batchStates.filter((s) => s === "done").length;
  const erroredIndex = batchStates.findIndex((s) => s === "error");
  const isComplete = doneCount === batches.length && batches.length > 0;
  const isRunning = batchStates.some((s) => s === "running");

  return {
    results,
    totalRows: rows.length,
    matchedRowCount: results.length,
    totalBatches: batches.length,
    doneBatches: doneCount,
    erroredBatchIndex: erroredIndex === -1 ? null : erroredIndex,
    isComplete,
    isRunning,
    start,
    retryBatch,
  };
}
