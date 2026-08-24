"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Mirrors the Tailwind breakpoints used for the grid's CSS column classes
 * (grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8) — §6.5's
 * "3 columns at 390px, scaling to 8 at 1440px" — so the virtualizer's row
 * height/column math always matches what's actually rendered.
 */
const BREAKPOINTS: { minWidth: number; columns: number }[] = [
  { minWidth: 1280, columns: 8 },
  { minWidth: 1024, columns: 6 },
  { minWidth: 640, columns: 4 },
  { minWidth: 0, columns: 3 },
];

function columnsForWidth(width: number): number {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.minWidth) return bp.columns;
  }
  return 3;
}

export function useResponsiveColumns(containerRef: RefObject<HTMLElement | null>) {
  const [columns, setColumns] = useState(3);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(width);
      setColumns(columnsForWidth(window.innerWidth));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return { columns, containerWidth };
}
