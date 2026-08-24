"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { posterUrl } from "@/lib/images";
import { copy } from "@/lib/copy";
import type { ImportMatchResult } from "@/lib/types";

export type Resolution = { filmId: number | null; skipped: boolean };

type ImportReviewProps = {
  results: ImportMatchResult[];
  onCommit: (resolved: { rowIndex: number; filmId: number }[]) => void;
  committing: boolean;
};

export function ImportReview({ results, onCommit, committing }: ImportReviewProps) {
  const matched = useMemo(() => results.filter((r) => r.status === "matched"), [results]);
  const ambiguous = useMemo(() => results.filter((r) => r.status === "ambiguous"), [results]);
  const unmatched = useMemo(() => results.filter((r) => r.status === "unmatched"), [results]);

  const [showMatchedList, setShowMatchedList] = useState(false);
  const [resolutions, setResolutions] = useState<Map<number, Resolution>>(new Map());

  function pick(rowIndex: number, filmId: number) {
    setResolutions((prev) => new Map(prev).set(rowIndex, { filmId, skipped: false }));
  }

  function skip(rowIndex: number) {
    setResolutions((prev) => new Map(prev).set(rowIndex, { filmId: null, skipped: true }));
  }

  const unresolvedAmbiguousCount = ambiguous.filter((r) => !resolutions.has(r.rowIndex)).length;

  function handleConfirm() {
    const resolved: { rowIndex: number; filmId: number }[] = [];
    for (const r of matched) {
      if (r.filmId) resolved.push({ rowIndex: r.rowIndex, filmId: r.filmId });
    }
    for (const r of ambiguous) {
      const resolution = resolutions.get(r.rowIndex);
      if (resolution && !resolution.skipped && resolution.filmId) {
        resolved.push({ rowIndex: r.rowIndex, filmId: resolution.filmId });
      }
    }
    onCommit(resolved);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-1 rounded-md p-4">
        <button
          type="button"
          onClick={() => setShowMatchedList((prev) => !prev)}
          className="text-headline flex w-full items-center justify-between"
        >
          <span>
            {copy.import.matchedLabel} · {matched.length}
          </span>
          <span className="text-good text-footnote">✓</span>
        </button>
        {showMatchedList && (
          <ul className="text-footnote text-label-2 mt-3 flex flex-col gap-1">
            {matched.map((r) => (
              <li key={r.rowIndex} className="truncate">
                {r.row.title} {r.row.year ? `(${r.row.year})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {ambiguous.length > 0 && (
        <div>
          <h3 className="text-title-2 mb-3">
            {copy.import.ambiguousLabel} · {ambiguous.length}
          </h3>
          <ul className="flex flex-col gap-4">
            {ambiguous.map((r) => {
              const resolution = resolutions.get(r.rowIndex);
              return (
                <li key={r.rowIndex} className="border-separator border-b pb-4 last:border-0">
                  <p className="text-body mb-2">
                    {r.row.title} {r.row.year ? `(${r.row.year})` : ""}
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {r.candidates.map((c) => {
                      const url = posterUrl(c.posterPath, "w342");
                      const isPicked = resolution?.filmId === c.filmId;
                      return (
                        <button
                          key={c.filmId}
                          type="button"
                          onClick={() => pick(r.rowIndex, c.filmId)}
                          className={clsx(
                            "w-20 shrink-0 overflow-hidden rounded-md outline-2 outline-offset-2",
                            isPicked ? "outline-accent" : "outline-transparent",
                          )}
                        >
                          <div className="bg-surface-2 relative aspect-[2/3]">
                            {url && (
                              <Image
                                src={url}
                                alt={`${c.title} (${c.year ?? "unknown year"}) poster`}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <p className="text-caption text-label-2 mt-1 truncate">
                            {c.title} {c.year ?? ""}
                          </p>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => skip(r.rowIndex)}
                      className={clsx(
                        "text-footnote flex w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md",
                        resolution?.skipped ? "text-accent" : "text-label-2",
                      )}
                    >
                      <div className="bg-surface-2 flex aspect-[2/3] w-full items-center justify-center rounded-md">
                        {copy.import.skip}
                      </div>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {unmatched.length > 0 && (
        <div>
          <h3 className="text-title-2 mb-3">
            {copy.import.unmatchedLabel} · {unmatched.length}
          </h3>
          <ul className="text-footnote text-label-2 flex flex-col gap-1">
            {unmatched.map((r) => (
              <li key={r.rowIndex} className="truncate">
                {r.row.title} {r.row.year ? `(${r.row.year})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={handleConfirm}
        disabled={committing || unresolvedAmbiguousCount > 0}
        className="w-full"
      >
        {committing ? copy.import.importing : copy.import.confirmImport}
      </Button>
      {unresolvedAmbiguousCount > 0 && (
        <p className="text-footnote text-label-2 text-center">
          {unresolvedAmbiguousCount} row{unresolvedAmbiguousCount === 1 ? "" : "s"} still need
          {unresolvedAmbiguousCount === 1 ? "s" : ""} a pick or skip.
        </p>
      )}
    </div>
  );
}
