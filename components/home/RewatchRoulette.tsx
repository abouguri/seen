"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { PosterThumb } from "@/components/film/PosterThumb";
import { Stars } from "@/components/ui/Stars";
import { copy } from "@/lib/copy";

type RouletteCandidate = {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  rating: number;
};

function pickRandom(candidates: RouletteCandidate[], excludeId: number | null) {
  const pool =
    excludeId !== null && candidates.length > 1
      ? candidates.filter((c) => c.id !== excludeId)
      : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * "I don't know what to rewatch" — one tap, one film, no argument attached.
 * The opposite mode from the "Worth another look" shelf: that one only
 * offers highly-rated films left unwatched for years, sorted and capped;
 * this pulls from every 4–5★ film and picks at random, on the client, so
 * "shuffle again" never round-trips to the server.
 */
export function RewatchRoulette({ candidates }: { candidates: RouletteCandidate[] }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<RouletteCandidate | null>(null);

  function shuffle() {
    setPick((current) => pickRandom(candidates, current?.id ?? null));
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          shuffle();
          setOpen(true);
        }}
      >
        {copy.home.rouletteTrigger}
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title={copy.home.rouletteSheetTitle}>
        {pick && (
          <div className="flex gap-5">
            <Link href={`/film/${pick.id}`} className="w-28 shrink-0 rounded-md">
              <PosterThumb
                title={pick.title}
                year={pick.year}
                posterPath={pick.posterPath}
                size="w342"
                sizes="112px"
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="text-title text-balance">
                <Link href={`/film/${pick.id}`} className="rounded-xs outline-offset-4">
                  {pick.title}
                </Link>
              </h3>
              {pick.year !== null && <p className="text-body text-label-2 mt-1">{pick.year}</p>}
              <div className="mt-2">
                <Stars value={pick.rating} />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={shuffle}>
                  {copy.home.rouletteShuffleAgain}
                </Button>
                <Link href={`/film/${pick.id}`} className={buttonClasses()}>
                  {copy.home.rouletteViewAction}
                </Link>
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
