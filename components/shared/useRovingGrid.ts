"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Roving-tabindex arrow-key traversal for a poster grid (§7.7): only the
 * active tile is a Tab stop, arrow keys move it in the 2D grid, Home/End
 * jump to the first/last tile. Space/Enter to activate a tile is already
 * native <button> behaviour — nothing extra needed for that part.
 */
export function useRovingGrid(itemCount: number, columns: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  const setItemRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      refs.current[index] = el;
    },
    [],
  );

  const focusIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(itemCount - 1, index));
      setActiveIndex(clamped);
      refs.current[clamped]?.focus();
    },
    [itemCount],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (columns <= 0) return;
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          focusIndex(index + 1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          focusIndex(index - 1);
          break;
        case "ArrowDown":
          event.preventDefault();
          focusIndex(index + columns);
          break;
        case "ArrowUp":
          event.preventDefault();
          focusIndex(index - columns);
          break;
        case "Home":
          event.preventDefault();
          focusIndex(0);
          break;
        case "End":
          event.preventDefault();
          focusIndex(itemCount - 1);
          break;
      }
    },
    [columns, itemCount, focusIndex],
  );

  return { activeIndex, setActiveIndex, setItemRef, handleKeyDown };
}
