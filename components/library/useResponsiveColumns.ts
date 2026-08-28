"use client";

import { useEffect, useState, type RefObject } from "react";

export type ColumnBreakpoint = { minWidth: number; columns: number };

/**
 * Mirrors the Tailwind breakpoints used for the library grid's CSS
 * column classes (grid-cols-3 sm:grid-cols-4 lg:grid-cols-6
 * xl:grid-cols-8) — §6.5's "3 columns at 390px, scaling to 8 at 1440px"
 * — so the virtualizer's row height/column math always matches what's
 * actually rendered.
 */
export const LIBRARY_COLUMNS: ColumnBreakpoint[] = [
  { minWidth: 1280, columns: 8 },
  { minWidth: 1024, columns: 6 },
  { minWidth: 640, columns: 4 },
  { minWidth: 0, columns: 3 },
];

/**
 * The poster wall runs denser than the library (SEEN Redesign): you're
 * sweeping across a year's output looking for covers you recognise, not
 * reading titles, so more posters per row is strictly better there.
 * Must stay in lockstep with the add grid's own column classes — this
 * hook is what tells useRovingGrid where the row edges are, and a
 * mismatch sends arrow keys to the wrong tile.
 */
export const WALL_COLUMNS: ColumnBreakpoint[] = [
  { minWidth: 1280, columns: 10 },
  { minWidth: 1024, columns: 8 },
  { minWidth: 640, columns: 5 },
  { minWidth: 0, columns: 3 },
];

function columnsForWidth(width: number, breakpoints: ColumnBreakpoint[]): number {
  for (const bp of breakpoints) {
    if (width >= bp.minWidth) return bp.columns;
  }
  return breakpoints[breakpoints.length - 1]?.columns ?? 3;
}

export function useResponsiveColumns(
  containerRef: RefObject<HTMLElement | null>,
  breakpoints: ColumnBreakpoint[] = LIBRARY_COLUMNS,
) {
  const [columns, setColumns] = useState(() => breakpoints[breakpoints.length - 1]?.columns ?? 3);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(width);
      setColumns(columnsForWidth(window.innerWidth, breakpoints));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, breakpoints]);

  return { columns, containerWidth };
}
