"use client";

import { useEffect, useRef } from "react";

/**
 * The ambient field behind the sign-in form: empty 2:3 tiles that fill
 * in one at a time, in a random order, on a slow loop. See the
 * .tile-field-tile block in globals.css for the animation itself —
 * everything visual lives there, and this component only supplies the
 * per-tile stagger and pauses the whole field when the tab is hidden.
 *
 * Why the randomness is hashed rather than Math.random()
 * ------------------------------------------------------
 * The delays are rendered into inline styles, so the server and the
 * client have to agree on them or React reports a hydration mismatch and
 * throws the markup away. Math.random() obviously can't, but neither can
 * the usual sin-based shader hash: Math.sin is implementation-defined in
 * ECMAScript, so a Node server and a non-V8 browser can legitimately
 * disagree in the last bits. Math.imul is exact 32-bit integer
 * arithmetic and is identical everywhere, which makes this stable across
 * engines — and stable *between renders*, so a tile doesn't jump to a
 * new phase when React re-renders the field.
 *
 * The grid is the library's own column ladder (3 → 4 → 6 → 8) at the 8px
 * gap the brief asks for, so the field reads as the same shelf the rest
 * of the app is built from rather than a decorative texture.
 */

/** 32 tiles fills the 8-column ladder four rows deep at xl, and the
 *  3-column one eleven rows deep on a phone — enough to run off the
 *  bottom of the viewport at every width without rendering hundreds. */
const TILE_COUNT = 32;

/** One full cycle. With 32 tiles spread across it, a tile changes state
 *  roughly every 2.2s — the "few seconds apart" the brief asks for. */
const CYCLE_SECONDS = 72;

/**
 * How much of the cycle the field is already through on first paint.
 *
 * Delays spread across 0..CYCLE make the field open completely empty and
 * take the best part of a minute to look like anything — measured at 4
 * of 32 tiles filled after 15 seconds, which is a blank grid for as long
 * as most people will look at this page. Shifting the range negative
 * starts roughly a third of the tiles mid-animation (a negative
 * animation-delay begins partway through), so the field opens as an
 * archive already in progress and keeps assembling from there. The
 * cadence between changes is untouched — only the phase moves.
 */
const SEEDED_FRACTION = 0.35;

/** fmix32 (MurmurHash3's finalizer): exact 32-bit integer ops only, so
 *  every engine returns the same 0..1 for the same index. */
function hashUnit(n: number): number {
  let h = n + 1;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function TileField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      el.dataset.tilesPaused = String(document.visibilityState === "hidden");
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 grid h-full auto-rows-min grid-cols-3 content-start gap-2 overflow-hidden p-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
    >
      {Array.from({ length: TILE_COUNT }, (_, i) => (
        <div
          key={i}
          className="tile-field-tile aspect-[2/3] rounded-md"
          style={
            {
              "--tile-delay": `${(
                (hashUnit(i) - SEEDED_FRACTION) *
                CYCLE_SECONDS
              ).toFixed(2)}s`,
              "--tile-cycle": `${CYCLE_SECONDS}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
