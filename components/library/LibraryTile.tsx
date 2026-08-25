"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus } from "lucide-react";
import { posterUrl } from "@/lib/images";
import { Stars } from "@/components/ui/Stars";
import type { LibraryItem } from "@/lib/types";

const LONG_PRESS_MS = 500;

type LibraryTileProps = {
  film: LibraryItem;
  onContextMenu: (film: LibraryItem, x: number, y: number) => void;
  /** Opens the log-viewing sheet directly — the hover/focus quick-action,
   *  a shortcut to the same thing the context menu's "Log another
   *  viewing" item does. */
  onQuickLog: (film: LibraryItem) => void;
  /** Roving-tabindex grid traversal (§7.7) — only the active tile is a
   *  Tab stop; arrow keys move it. The quick-action button mirrors this:
   *  it's only in the tab order when its own tile is the active one, so
   *  a large grid doesn't gain a second tab stop per tile. */
  tabIndex?: number;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFocus?: () => void;
  tileRef?: (el: HTMLButtonElement | null) => void;
};

/**
 * Tapping the poster navigates into film detail with a shared-element
 * transition (§7.4, the app's one showpiece animation); long-press/
 * right-click opens the context menu instead of navigating. Hover/focus
 * lifts the poster (SEEN Interaction Plan §3.3) and reveals a quick-log
 * button — deliberately a translateY lift, not a scale-up: growing a
 * tile in a dense "things I've already watched" grid shoves its
 * neighbours around and implies "preview this."
 *
 * The quick-log button is a DOM *sibling* of the poster button, not a
 * child of it — nesting a real or ARIA-faked button inside a native
 * <button> isn't reliably focusable or announced correctly. Both sit in
 * the same relative wrapper instead, overlapping only visually.
 */
export function LibraryTile({
  film,
  onContextMenu,
  onQuickLog,
  tabIndex,
  onKeyDown,
  onFocus,
  tileRef,
}: LibraryTileProps) {
  const isActive = tabIndex === 0;
  const router = useRouter();
  const imgRef = useRef<HTMLDivElement>(null);
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = posterUrl(film.posterPath, "w342");
  const alt = `${film.title} (${film.year ?? "unknown year"}) poster`;
  const href = film.mediaType === "movie" ? `/film/${film.id}` : `/show/${film.id}`;

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
    <div className="flex flex-col gap-1.5">
      <div className="group relative">
        <button
          ref={tileRef}
          type="button"
          tabIndex={tabIndex}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onPointerDown={handlePointerDown}
          onPointerUp={clearLongPress}
          onPointerLeave={clearLongPress}
          onPointerCancel={clearLongPress}
          onMouseEnter={() => router.prefetch(href)}
          aria-label={film.title}
          className="focus-visible:outline-accent relative block aspect-2/3 w-full overflow-hidden rounded-sm outline-offset-2"
        >
          <div
            ref={imgRef}
            className="absolute inset-0 translate-y-0 shadow-none transition-[translate,box-shadow] duration-(--t-card) ease-(--default-transition-timing-function) group-hover:-translate-y-1 group-hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,.75)] group-focus-within:-translate-y-1 group-focus-within:shadow-[0_10px_24px_-8px_rgba(0,0,0,.75)] group-active:-translate-y-px"
          >
            {url ? (
              <>
                {/* Pulses until the image paints over it — no load-state
                    tracking needed, the opaque cover art just occludes it. */}
                <div className="bg-surface-2 absolute inset-0 animate-pulse" />
                <Image
                  src={url}
                  alt={alt}
                  fill
                  sizes="(min-width: 1280px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 24vw, 32vw"
                  className="object-cover"
                />
              </>
            ) : (
              <div className="bg-surface-2 text-label-2 text-subhead flex h-full w-full items-center justify-center p-2 text-center">
                {film.title}
              </div>
            )}
          </div>

          {film.rating != null && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-linear-to-t from-black/85 to-transparent p-2 pt-6 opacity-0 transition-opacity duration-(--t-hover) group-hover:opacity-100 group-focus-visible:opacity-100">
              <Stars value={film.rating} size={12} />
              {film.watchCount > 1 && (
                <span className="text-caption text-label-2">{film.watchCount}×</span>
              )}
            </div>
          )}
        </button>

        <button
          type="button"
          tabIndex={isActive ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            onQuickLog(film);
          }}
          aria-label={`Log another viewing of ${film.title}`}
          className="bg-scrim/70 text-label hover:bg-accent hover:text-on-accent absolute top-1.5 right-1.5 flex h-7.5 w-7.5 items-center justify-center rounded-full opacity-0 transition-[opacity,background-color,color] duration-(--t-hover) ease-(--default-transition-timing-function) group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div aria-hidden="true">
        <p className="text-subhead font-semibold text-ellipsis whitespace-nowrap overflow-hidden">
          {film.title}
        </p>
        <p className="text-footnote text-label-2">{film.year ?? ""}</p>
      </div>
    </div>
  );
}
