"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { PosterThumb } from "@/components/film/PosterThumb";
import { copy } from "@/lib/copy";

type BlindPickCandidate = {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
};

function pickRandom(candidates: BlindPickCandidate[], excludeId: number | null) {
  const pool =
    excludeId !== null && candidates.length > 1
      ? candidates.filter((c) => c.id !== excludeId)
      : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * "Surprise me from what's already here" — draws from the same lead +
 * shelf candidates the rest of the page already computed for this render
 * (no separate filter, no rating floor, unlike RewatchRoulette), and
 * hides the pick behind a reveal step instead of showing it immediately.
 * No reason line even after reveal — that omission is the whole point of
 * this module, unlike every other card on the page.
 */
export function BlindPick({ candidates }: { candidates: BlindPickCandidate[] }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<BlindPickCandidate | null>(null);
  const [revealed, setRevealed] = useState(false);

  function pickAgain() {
    setPick((current) => pickRandom(candidates, current?.id ?? null));
    setRevealed(false);
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          pickAgain();
          setOpen(true);
        }}
      >
        {copy.home.blindPickTrigger}
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title={copy.home.blindPickSheetTitle}>
        {pick && (
          <div className="flex gap-5">
            {revealed ? (
              <Link href={`/film/${pick.id}`} className="w-28 shrink-0 rounded-md">
                <PosterThumb
                  title={pick.title}
                  year={pick.year}
                  posterPath={pick.posterPath}
                  size="w342"
                  sizes="112px"
                />
              </Link>
            ) : (
              <div
                className="bg-surface-2 text-label-3 flex aspect-2/3 w-28 shrink-0 items-center justify-center rounded-md text-3xl font-bold"
                role="img"
                aria-label={copy.home.blindPickMysteryLabel}
              >
                ?
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col justify-center">
              {revealed ? (
                <>
                  <h3 className="text-title text-balance">
                    <Link href={`/film/${pick.id}`} className="rounded-xs outline-offset-4">
                      {pick.title}
                    </Link>
                  </h3>
                  {pick.year !== null && (
                    <p className="text-body text-label-2 mt-1">{pick.year}</p>
                  )}
                </>
              ) : (
                <p className="text-body text-label-2">
                  {copy.home.blindPickMysteryLabel}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {revealed ? (
                  <>
                    <Button variant="secondary" onClick={pickAgain}>
                      {copy.home.blindPickAgain}
                    </Button>
                    <Link href={`/film/${pick.id}`} className={buttonClasses()}>
                      {copy.home.rouletteViewAction}
                    </Link>
                  </>
                ) : (
                  <Button variant="primary" onClick={() => setRevealed(true)}>
                    {copy.home.blindPickReveal}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
