"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { APP_NAME } from "@/lib/constants";

/**
 * Mobile-only top bar. §7.5's tab bar has no Settings destination, so
 * sign-out needs a reachable spot until Settings (§6.9) exists — this is
 * that spot for now.
 */
export function MobileHeader() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <header
      className="material-chrome border-separator sticky top-0 z-20 flex h-14 items-center justify-between border-b px-4 md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <span className="text-headline">{APP_NAME}</span>
      <button
        type="button"
        onClick={handleSignOut}
        aria-label={copy.account.signOut}
        className="text-label-2 flex h-11 w-11 items-center justify-center"
      >
        <LogOut size={20} strokeWidth={2} />
      </button>
    </header>
  );
}
