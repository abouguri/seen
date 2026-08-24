import { BarChart3, CirclePlus, LibraryBig, Search } from "lucide-react";
import { copy } from "@/lib/copy";

export const NAV_ITEMS = [
  { href: "/library", label: copy.nav.library, icon: LibraryBig },
  { href: "/add", label: copy.nav.add, icon: CirclePlus },
  { href: "/search", label: copy.nav.search, icon: Search },
  { href: "/stats", label: copy.nav.stats, icon: BarChart3 },
] as const;
