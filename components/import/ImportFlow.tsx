"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseImportFile } from "@/lib/import/parse";
import { resolveEntryFields } from "@/lib/import/resolve";
import { useImportMatching } from "@/components/import/useImportMatching";
import { ImportReview } from "@/components/import/ImportReview";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import type { ImportMatchResult, NormalizedImportRow } from "@/lib/types";

type FlowState = "idle" | "parsing" | "parse-error" | "matching" | "reviewing" | "committing" | "done" | "commit-error";

export function ImportFlow() {
  const router = useRouter();
  const [state, setState] = useState<FlowState>("idle");
  const [rows, setRows] = useState<NormalizedImportRow[]>([]);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowsByIndex = useRef<Map<number, NormalizedImportRow>>(new Map());

  const matching = useImportMatching(rows);
  const hasStartedRef = useRef(false);

  // Kick off matching once rows actually lands — calling matching.start()
  // synchronously in handleFileChange would close over the *previous*
  // render's hook instance, whose internal batch list is still empty (it's
  // computed from `rows`, which hasn't updated yet at that point). Waiting
  // for the effect after rows changes guarantees matching reflects the
  // hook instance that actually has the batches.
  useEffect(() => {
    if (rows.length > 0 && !hasStartedRef.current) {
      hasStartedRef.current = true;
      matching.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setState("parsing");
    try {
      const parsed = await parseImportFile(file);
      if (parsed.rows.length === 0) {
        setState("parse-error");
        return;
      }
      rowsByIndex.current = new Map(parsed.rows.map((r) => [r.rowIndex, r]));
      setState("matching");
      setRows(parsed.rows);
    } catch {
      setState("parse-error");
    }
  }

  async function handleCommit(resolved: { rowIndex: number; filmId: number }[]) {
    setState("committing");
    const payload = resolved.map(({ rowIndex, filmId }) => {
      const row = rowsByIndex.current.get(rowIndex)!;
      const fields = resolveEntryFields(row);
      return { filmId, ...fields };
    });

    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { imported: number; skipped: number };
      setResult(data);
      setState("done");
    } catch {
      setState("commit-error");
    }
  }

  if (state === "idle" || state === "parse-error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-body text-label-2 max-w-[36ch]">{copy.import.dropHint}</p>
        {state === "parse-error" && (
          <p className="text-footnote text-danger max-w-[36ch]">{copy.import.unrecognisedFormat}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()}>{copy.import.chooseFile}</Button>
      </div>
    );
  }

  if (state === "parsing") {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-body text-label-2">{copy.import.parsing}</p>
      </div>
    );
  }

  if (state === "matching") {
    const erroredIndex = matching.erroredBatchIndex;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-body text-label-2">
          {copy.import.matching} {matching.matchedRowCount} / {matching.totalRows}
        </p>
        {erroredIndex !== null && (
          <>
            <p className="text-footnote text-danger max-w-[36ch]">{copy.import.matchBatchFailed}</p>
            <Button variant="secondary" onClick={() => matching.retryBatch(erroredIndex)}>
              {copy.import.retryBatch}
            </Button>
          </>
        )}
        {matching.isComplete && (
          <Button onClick={() => setState("reviewing")}>{copy.import.reviewTitle}</Button>
        )}
      </div>
    );
  }

  if (state === "reviewing" || state === "committing" || state === "commit-error") {
    return (
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-9">
        <h1 className="text-display-2 mb-6">{copy.import.reviewTitle}</h1>
        {state === "commit-error" && (
          <p className="text-footnote text-danger mb-4">{copy.import.commitFailed}</p>
        )}
        <ImportReview
          results={matching.results as ImportMatchResult[]}
          onCommit={handleCommit}
          committing={state === "committing"}
        />
      </div>
    );
  }

  if (state === "done" && result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-title-2">
          {result.imported} film{result.imported === 1 ? "" : "s"} imported
        </p>
        {result.skipped > 0 && (
          <p className="text-body text-label-2">
            {result.skipped} skipped — already in your library
          </p>
        )}
        <Button onClick={() => router.push("/library")}>{copy.library.title}</Button>
      </div>
    );
  }

  return null;
}
