"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { clsx } from "clsx";
import { NAV_ITEMS } from "@/components/shell/nav-items";
import { copy } from "@/lib/copy";
import { APP_NAME } from "@/lib/constants";

/** Desktop fixed left sidebar (§7.5) — same four destinations as the tab bar. */
export function Sidebar() {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/settings");

  return (
    <aside className="border-separator fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r md:flex">
      <div className="px-6 pt-8 pb-6">
        <span className="text-title-2">{APP_NAME}</span>
      </div>

      <nav aria-label="Primary" className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "text-headline flex min-h-11 items-center gap-3 rounded-md px-3",
                    active ? "bg-accent-dim text-accent-text" : "text-label-2 hover:bg-surface-1",
                  )}
                >
                  <Icon size={20} strokeWidth={2} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-6">
        <Link
          href="/settings"
          aria-current={settingsActive ? "page" : undefined}
          className={clsx(
            "text-headline flex min-h-11 w-full items-center gap-3 rounded-md px-3",
            settingsActive ? "bg-accent-dim text-accent-text" : "text-label-2 hover:bg-surface-1",
          )}
        >
          <Settings size={20} strokeWidth={2} />
          {copy.settings.title}
        </Link>
      </div>
    </aside>
  );
}
