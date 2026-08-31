"use client";

import { useRef } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { posterUrl } from "@/lib/images";
import { Stars } from "@/components/ui/Stars";
import type { LibraryItem } from "@/lib/types";

const LONG_PRESS_MS = 500;

type LibraryTileProps = {
  film: LibraryItem;
  onContextMenu: (film: LibraryItem, x: number, y: number) => void;
  /** Opens the detail panel, not a page navigation (see
   *  components/library/DetailPanel.tsx for why). */
  onOpen: (film: LibraryItem) => void;
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
 * Tapping the poster opens the detail panel in place — a full page
 * navigation here was a real perceived-latency complaint (new route,
 * new RSC payload, a blank moment before anything appears), and the
 * panel's poster/title are already known from this very grid item, so
 * it opens with zero fetch. Long-press/right-click opens the context
 * menu instead. Hover/focus lifts the poster (SEEN Interaction Plan
 * §3.3) and reveals a quick-log button — deliberately a translateY
 * lift, not a scale-up: growing a tile in a dense "things I've already
 * watched" grid shoves its neighbours around and implies "preview this."
 *
 * A rewatched title is drawn as a *stack* of posters rather than a
 * single card (SEEN Redesign) — one card peeking out behind for a second
 * viewing, two for a third or more. It's the one place in the grid where
 * the shape of a tile carries data, and it's what makes a well-worn
 * library legible at a glance instead of uniform. The count badge in the
 * corner is the non-decorative half of that: the stack alone tops out at
 * "three or more", the badge says which.
 *
 * The quick-log button is a DOM *sibling* of the poster button, not a
 * child of it — nesting a real or ARIA-faked button inside a native
 * <button> isn't reliably focusable or announced correctly. Both sit in
 * the same relative wrapper instead, overlapping only visually.
 */
export function LibraryTile({
  film,
  onContextMenu,
  onOpen,
  onQuickLog,
  tabIndex,
  onKeyDown,
  onFocus,
  tileRef,
}: LibraryTileProps) {
  const isActive = tabIndex === 0;
  const imgRef = useRef<HTMLDivElement>(null);
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = posterUrl(film.posterPath, "w342");
  const alt = `${film.title} (${film.year ?? "unknown year"}) poster`;
  const rewatched = film.watchCount > 1;

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

  function handleClick() {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    onOpen(film);
  }

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    onContextMenu(film, event.clientX, event.clientY);
  }

  return (
    <div className="flex flex-col gap-1.5 pt-1.5">
      <div className="group relative">
        {/* The cards behind. Offset into the grid gutter (10px into a
            14px gap) so they read as a stack without colliding with the
            neighbouring tile. aria-hidden — the count badge below says
            the same thing in words. */}
        {film.watchCount > 2 && (
          <span
            aria-hidden="true"
            className="bg-warm absolute -top-1.5 right-[-10px] bottom-4.5 left-2.5 rounded-sm opacity-50"
          />
        )}
        {rewatched && (
          <span
            aria-hidden="true"
            className="bg-accent-text absolute top-0 right-[-5px] bottom-3.5 left-1.5 rounded-sm opacity-55"
          />
        )}

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
          aria-haspopup="dialog"
          aria-label={
            rewatched ? `${film.title}, seen ${film.watchCount} times` : film.title
          }
          className="relative block aspect-2/3 w-full overflow-hidden rounded-sm outline-offset-2"
        >
          <div
            ref={imgRef}
            className="absolute inset-0 translate-y-0 shadow-none transition-[translate,box-shadow] duration-(--t-card) ease-(--default-transition-timing-function) group-hover:-translate-y-1.5 group-hover:shadow-[0_14px_30px_-8px_rgba(0,0,0,.55)] group-focus-within:-translate-y-1.5 group-focus-within:shadow-[0_14px_30px_-8px_rgba(0,0,0,.55)] group-active:-translate-y-px"
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

          {rewatched && (
            <span className="bg-scrim/70 text-caption border-separator-strong text-label pointer-events-none absolute top-2 left-2 rounded-full border px-1.5 py-0.5 font-bold backdrop-blur-md">
              {film.watchCount}×
            </span>
          )}

          {film.rating != null && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center bg-linear-to-t from-black/85 to-transparent p-2 pt-6 opacity-0 transition-opacity duration-(--t-hover) group-hover:opacity-100 group-focus-visible:opacity-100">
              <Stars value={film.rating} size={12} />
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
        <p className="text-footnote overflow-hidden font-bold text-ellipsis whitespace-nowrap">
          {film.title}
        </p>
        <p className="text-caption text-label-2">{film.year ?? ""}</p>
      </div>
    </div>
  );
}
