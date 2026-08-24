"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { copy } from "@/lib/copy";
import { APP_NAME } from "@/lib/constants";

/** Mobile-only top bar. §7.5's tab bar has no Settings destination — the gear here is it. */
export function MobileHeader() {
  return (
    <header
      className="material-chrome border-separator sticky top-0 z-20 flex h-14 items-center justify-between border-b px-4 md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <span className="text-headline">{APP_NAME}</span>
      <Link
        href="/settings"
        aria-label={copy.settings.title}
        className="text-label-2 flex h-11 w-11 items-center justify-center"
      >
        <Settings size={20} strokeWidth={2} />
      </Link>
    </header>
  );
}
