"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { posterUrl } from "@/lib/images";
import type { FilmSummary } from "@/lib/types";

const SPRING = { type: "spring", stiffness: 320, damping: 32, mass: 0.9 } as const;
const LONG_PRESS_MS = 500;

type PosterTileProps = {
  film: FilmSummary;
  selected: boolean;
  /** False when seen only via a manual/import entry — the checkmark is
   *  shown but muted, and the tile doesn't respond to taps (§9: the wall
   *  never deletes an entry it didn't create). */
  removable: boolean;
  onToggle: (filmId: number) => void;
  /** Roving-tabindex grid traversal (§7.7) — only the active tile is a
   *  Tab stop; arrow keys move it. */
  tabIndex?: number;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFocus?: () => void;
  tileRef?: (el: HTMLButtonElement | null) => void;
};

/**
 * The poster wall's core unit (§6.2/§7.4). Unselected posters are
 * desaturated; a tap toggles seen with a spring-in checkmark, a
 * press-down scale, and one light haptic. Titles are hidden by default —
 * hover reveals them on desktop, long-press on touch.
 */
export function PosterTile({
  film,
  selected,
  removable,
  onToggle,
  tabIndex,
  onKeyDown,
  onFocus,
  tileRef,
}: PosterTileProps) {
  const reduceMotion = useReducedMotion();
  const [showTitleTouch, setShowTitleTouch] = useState(false);
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = posterUrl(film.posterPath, "w342");
  const alt = `${film.title} (${film.year ?? "unknown year"}) poster`;
  const interactive = !selected || removable;

  function handlePointerDown(event: React.PointerEvent) {
    if (event.pointerType !== "touch") return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowTitleTouch(true);
    }, LONG_PRESS_MS);
  }

  function clearLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setShowTitleTouch(false);
  }

  function handleClick() {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    if (!interactive) return;
    if (navigator.vibrate) navigator.vibrate(10);
    onToggle(film.id);
  }

  return (
    <motion.button
      ref={tileRef}
      type="button"
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      aria-pressed={selected}
      aria-disabled={!interactive}
      aria-label={`${film.title}${selected ? ", seen" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
      onClick={handleClick}
      whileTap={{ scale: reduceMotion || !interactive ? 1 : 0.96 }}
      transition={SPRING}
      className="group focus-visible:outline-accent relative aspect-[2/3] w-full overflow-hidden rounded-md outline-offset-2"
    >
      <div className="bg-surface-2 absolute inset-0">
        {url ? (
          <Image
            src={url}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 12vw, (min-width: 640px) 20vw, 30vw"
            className={clsx(
              "object-cover transition-[filter] duration-300",
              selected ? "grayscale-0" : "grayscale",
            )}
          />
        ) : (
          <div className="text-label-2 text-subhead flex h-full w-full items-center justify-center p-2 text-center">
            {film.title}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0.12 } : SPRING}
            className={clsx(
              "absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full",
              removable ? "bg-accent" : "bg-surface-3",
            )}
          >
            <Check size={14} strokeWidth={3} className={removable ? "text-on-accent" : "text-label-2"} />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={clsx(
          "text-caption text-label pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-scrim/80 to-transparent px-1.5 pt-4 pb-1 text-left opacity-0 transition-opacity duration-150",
          "md:group-hover:opacity-100",
          showTitleTouch && "opacity-100",
        )}
      >
        {film.title}
      </div>
    </motion.button>
  );
}
