"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { NAV_ITEMS } from "@/components/shell/nav-items";

/**
 * The mobile half of the navigation — the same five destinations as
 * SideRail, laid along the bottom edge where a thumb reaches. Shown
 * below md only; the two never render at once.
 *
 * Labels are visible here rather than icon-only as in the rail: there's
 * room for them across the width, and at arm's length on a phone a bare
 * glyph is a guess. The active item repeats the rail's two cues (tint
 * plus a mark), rotated to the top edge of the tab.
 */
export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="material-chrome border-separator flex shrink-0 items-stretch border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "focus-visible:outline-accent relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 -outline-offset-2 transition-colors duration-(--t-hover) ease-(--default-transition-timing-function)",
              active ? "text-accent-text" : "text-label-3",
            )}
          >
            {active && (
              <span
                aria-hidden="true"
                className="bg-accent-text absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full"
              />
            )}
            <Icon size={20} strokeWidth={1.7} />
            <span className="text-[0.625rem] leading-3 font-bold tracking-wide">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
