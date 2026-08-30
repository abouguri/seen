"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { NAV_ITEMS, isNavItemActive } from "@/components/shell/nav-items";
import { SeenMark } from "@/components/shell/SeenMark";
import { APP_NAME } from "@/lib/constants";

/**
 * Desktop navigation: a 76px icon rail on the recessed --bg-2 ground,
 * per the SEEN Redesign. Icons only — every destination is one glyph
 * with an accessible name, which is what lets the content area run edge
 * to edge for the poster grid.
 *
 * The active item gets two cues, not one: a tinted tile *and* a lilac
 * mark bleeding off the left edge. Colour alone would fail §7.7, and the
 * tint is subtle enough on its own to lose at a glance.
 *
 * Hidden below md, where BottomTabs takes over — the rail would cost a
 * fifth of the width at the 390px floor (§02).
 */
export function SideRail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-separator bg-bg-2 hidden w-19 shrink-0 flex-col items-center gap-1.5 border-r py-5 md:flex"
    >
      <Link
        href="/library"
        className="mb-6 rounded-xs outline-offset-4"
      >
        <SeenMark />
        <span className="sr-only">{APP_NAME}</span>
      </Link>

      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isNavItemActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label}
            className={clsx(
              "relative grid h-12 w-12 place-items-center rounded-md outline-offset-2 transition-colors duration-(--t-hover) ease-(--default-transition-timing-function)",
              active
                ? "bg-accent-dim text-accent-text"
                : "text-label-3 hover:text-label-2",
            )}
          >
            {active && (
              <span
                aria-hidden="true"
                className="bg-accent-text absolute top-1/2 -left-2.5 h-5.5 w-[3px] -translate-y-1/2 rounded-full"
              />
            )}
            <Icon size={20} strokeWidth={1.7} />
            <span className="sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
