"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useReducedMotion } from "framer-motion";

const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear() + 1;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i);

type YearScrollerProps = {
  year: number;
  onChange: (year: number) => void;
};

/** Segmented year scroller (§6.2 wireframe: ‹ 2008 2009 [2010] 2011 ›). */
export function YearScroller({ year, onChange }: YearScrollerProps) {
  const reduceMotion = useReducedMotion();
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [year, reduceMotion]);

  return (
    <div className="flex items-center gap-1 px-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(MIN_YEAR, year - 1))}
        aria-label="Previous year"
        disabled={year <= MIN_YEAR}
        className="text-label-2 flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-30"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex flex-1 gap-1 overflow-x-auto scroll-smooth px-1 py-2 [scrollbar-width:none]">
        {YEARS.map((y) => {
          const active = y === year;
          return (
            <button
              key={y}
              ref={active ? activeRef : undefined}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => onChange(y)}
              className={clsx(
                "text-subhead min-h-11 shrink-0 rounded-md px-3 py-2 tabular-nums",
                active ? "bg-accent text-on-accent" : "text-label-2 hover:text-label",
              )}
            >
              {y}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_YEAR, year + 1))}
        aria-label="Next year"
        disabled={year >= MAX_YEAR}
        className="text-label-2 flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-30"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
