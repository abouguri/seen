"use client";

import { forwardRef, useEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";

const COLLAPSE_DISTANCE = 44;

/**
 * §7.2: the 34pt large title shrinks into a 17pt inline title as a
 * translucent bar materialises, reversing on scroll up. Driven by direct
 * DOM writes in a rAF-throttled scroll handler — not React state — so it
 * never triggers a re-render on every scroll pixel, which matters a lot
 * once the grid below is virtualizing hundreds of tiles at 60fps.
 */
export function useCollapsingHeader(
  scrollRef: RefObject<HTMLElement | null>,
  barRef: RefObject<HTMLDivElement | null>,
  titleRef: RefObject<HTMLHeadingElement | null>,
) {
  const reduceMotion = useReducedMotion();
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    function apply() {
      rafRef.current = null;
      const scrollTop = scrollEl!.scrollTop;
      const progress = Math.min(1, Math.max(0, scrollTop / COLLAPSE_DISTANCE));

      if (barRef.current) {
        barRef.current.style.opacity = String(progress);
      }
      if (titleRef.current) {
        if (reduceMotion) {
          titleRef.current.style.opacity = String(1 - progress);
          titleRef.current.style.transform = "none";
        } else {
          titleRef.current.style.opacity = String(1 - progress * 0.5);
          titleRef.current.style.transform = `scale(${1 - progress * 0.1})`;
        }
      }
    }

    function handleScroll() {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(apply);
    }

    apply();
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [scrollRef, barRef, titleRef, reduceMotion]);
}

export const StickyInlineBar = forwardRef<HTMLDivElement, { title: string }>(function StickyInlineBar(
  { title },
  ref,
) {
  return (
    <div
      ref={ref}
      className="material-chrome border-separator sticky top-0 z-10 flex h-11 items-center justify-center border-b opacity-0"
      style={{ transformOrigin: "top center" }}
    >
      <span className="text-headline">{title}</span>
    </div>
  );
});

export const LargeTitle = forwardRef<HTMLHeadingElement, { title: string }>(function LargeTitle(
  { title },
  ref,
) {
  return (
    <h1
      ref={ref}
      className="text-large-title origin-top-left px-4 pt-4 pb-2 md:px-8"
    >
      {title}
    </h1>
  );
});
