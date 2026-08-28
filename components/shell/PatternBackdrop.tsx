"use client";

import { usePathname } from "next/navigation";

/**
 * Two fixed texture layers behind every signed-in screen: the shell grain
 * that runs everywhere, and one accent pattern chosen by route.
 *
 * Fixed rather than scrolled with the content — the pattern is the room
 * the app is in, not part of the page. Scrolling a 112px frame grid past
 * a poster grid turns a texture into a moiré.
 *
 * Both layers are aria-hidden and pointer-events-none, and neither ever
 * carries a background colour: they sit over --bg so a surface placed on
 * top (a card, the nav rail, a sheet) simply covers them.
 */
const ROUTE_PATTERNS: { prefix: string; pattern: string }[] = [
  // Contact sheet under the contact sheet — the frame grid is set at 2:3
  // to rhyme with the poster tiles sitting on it.
  { prefix: "/library", pattern: "pattern-contact-ledger" },
  // The logo's own geometry, cropped by the viewport, while you build the
  // stack it's drawn from.
  { prefix: "/add", pattern: "pattern-cropped-stack" },
  // Mostly-empty screens get atmosphere instead of structure.
  { prefix: "/search", pattern: "pattern-projector-veil" },
  { prefix: "/stats", pattern: "pattern-timeline-index" },
  // Settings and import are archive paperwork.
  { prefix: "/settings", pattern: "pattern-paper-register" },
  // The full detail pages, matching the detail panel's own pattern.
  { prefix: "/film", pattern: "pattern-aperture-echo" },
  { prefix: "/show", pattern: "pattern-aperture-echo" },
];

export function PatternBackdrop() {
  const pathname = usePathname();
  const accent = ROUTE_PATTERNS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.pattern;

  return (
    <>
      <div aria-hidden="true" className="pattern-layer pattern-archive-grain fixed -z-10" />
      {accent && <div aria-hidden="true" className={`pattern-layer ${accent} fixed -z-10`} />}
    </>
  );
}
