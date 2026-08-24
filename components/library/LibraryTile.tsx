"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { posterUrl } from "@/lib/images";
import type { LibraryFilm } from "@/lib/types";

const LONG_PRESS_MS = 500;

type LibraryTileProps = {
  film: LibraryFilm;
  onContextMenu: (film: LibraryFilm, x: number, y: number) => void;
};

/**
 * Poster only — no title, no rating, no chrome (§6.5). Tapping navigates
 * into film detail with a shared-element transition (§7.4, the app's one
 * showpiece animation); long-press/right-click opens the context menu
 * instead of navigating.
 */
export function LibraryTile({ film, onContextMenu }: LibraryTileProps) {
  const router = useRouter();
  const imgRef = useRef<HTMLDivElement>(null);
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = posterUrl(film.posterPath, "w342");
  const alt = `${film.title} (${film.year ?? "unknown year"}) poster`;
  const href = `/film/${film.id}`;

  function handlePointerDown(event: React.PointerEvent) {
    if (event.pointerType !== "touch") return;
    isLongPress.current = false;
    const { clientX, clientY } = event;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      onContextMenu(film, clientX, clientY);
    }, LONG_PRESS_MS);
  }

  function clearLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function navigate() {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const supportsViewTransitions =
      typeof document !== "undefined" && "startViewTransition" in document;

    if (!supportsViewTransitions) {
      router.push(href);
      return;
    }

    // Reduced motion: still use the View Transition API so navigation
    // gets the browser's default full-page crossfade (shortened to
    // 120ms in globals.css) — but skip naming the poster, so there's no
    // shape/position morph, only that plain opacity fade (§7.4).
    if (!reduceMotion && imgRef.current) {
      imgRef.current.style.viewTransitionName = "shared-poster";
    }

    document.startViewTransition(() => {
      return new Promise<void>((resolve) => {
        router.push(href);
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });
  }

  function handleClick() {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    navigate();
  }

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    onContextMenu(film, event.clientX, event.clientY);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
      onMouseEnter={() => router.prefetch(href)}
      aria-label={film.title}
      className="focus-visible:outline-accent relative block aspect-[2/3] w-full overflow-hidden rounded-md outline-offset-2"
    >
      <div ref={imgRef} className="bg-surface-2 absolute inset-0">
        {url ? (
          <Image
            src={url}
            alt={alt}
            fill
            sizes="(min-width: 1280px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 24vw, 32vw"
            className="object-cover"
          />
        ) : (
          <div className="text-label-2 text-subhead flex h-full w-full items-center justify-center p-2 text-center">
            {film.title}
          </div>
        )}
      </div>
    </button>
  );
}
