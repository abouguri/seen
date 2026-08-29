import { BarChart3, CirclePlus, LibraryBig, Search, Settings, Sparkles } from "lucide-react";
import { copy } from "@/lib/copy";

/**
 * Library stays first. The homepage is a destination, not a replacement
 * for the archive — SEEN is a record before it is a recommender, and
 * putting suggestions above the thing they're derived from would invert
 * that. It sits second, where it reads as somewhere to go rather than
 * as the app's front page.
 */
export const NAV_ITEMS = [
  { href: "/library", label: copy.nav.library, icon: LibraryBig },
  { href: "/", label: copy.nav.home, icon: Sparkles },
  { href: "/add", label: copy.nav.add, icon: CirclePlus },
  { href: "/search", label: copy.nav.search, icon: Search },
  { href: "/stats", label: copy.nav.stats, icon: BarChart3 },
  { href: "/settings", label: copy.settings.title, icon: Settings },
] as const;

/**
 * Whether a nav item is the current page.
 *
 * The root needs its own branch: every path starts with "/", so the
 * prefix test that makes /library match /library/x would light the
 * homepage up on every screen in the app. Exact match only for "/".
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
