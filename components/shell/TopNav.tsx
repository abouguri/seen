"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { NAV_ITEMS } from "@/components/shell/nav-items";
import { APP_NAME } from "@/lib/constants";

/**
 * Single sticky top bar for every breakpoint — wordmark, tabs, live film
 * count — replacing the old sidebar (desktop) / bottom tab bar + separate
 * header (mobile) split, per the SEEN App redesign. The tab row scrolls
 * horizontally under ~500px rather than wrapping or dropping labels, so
 * every destination stays reachable and named at the 390px floor (§02).
 */
export function TopNav() {
  const pathname = usePathname();

  const { data } = useQuery({
    queryKey: ["library-count"],
    queryFn: async () => {
      const res = await fetch("/api/library?sort=recent_added&page=1");
      if (!res.ok) throw new Error();
      return (await res.json()) as { total: number };
    },
    staleTime: 30_000,
  });

  return (
    <header
      className="material-chrome border-separator sticky top-0 z-20 flex h-14 items-center gap-4 border-b px-4 md:px-8"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <Link href="/library" className="text-headline shrink-0 font-bold tracking-tight">
        {APP_NAME}
      </Link>

      <nav aria-label="Primary" className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto md:justify-center md:gap-6">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "text-subhead flex h-11 shrink-0 items-center whitespace-nowrap px-2",
                active ? "text-label font-medium" : "text-label-2",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <span className="text-caption text-label-2 font-mono hidden shrink-0 sm:inline">
        {data ? `${data.total} film${data.total === 1 ? "" : "s"}` : ""}
      </span>
    </header>
  );
}
