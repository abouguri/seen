"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { NAV_ITEMS } from "@/components/shell/nav-items";

/**
 * Mobile bottom tab bar (§7.5). Add is centre and visually weighted —
 * it's the habit the product depends on, so it gets a filled accent
 * treatment instead of matching the other three outline icons.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="material-chrome border-separator fixed inset-x-0 bottom-0 z-20 border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-16 items-stretch justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const isAdd = href === "/add";

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex h-full min-w-11 flex-col items-center justify-center gap-1"
              >
                {isAdd ? (
                  <span className="bg-accent -mt-4 flex h-11 w-11 items-center justify-center rounded-full">
                    <Icon className="text-on-accent" size={24} strokeWidth={2} />
                  </span>
                ) : (
                  <Icon
                    className={active ? "text-accent" : "text-label-2"}
                    size={24}
                    strokeWidth={2}
                  />
                )}
                <span
                  className={clsx(
                    "text-caption",
                    isAdd ? "sr-only" : active ? "text-accent" : "text-label-2",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
