import { SideRail } from "@/components/shell/SideRail";
import { BottomTabs } from "@/components/shell/BottomTabs";
import { PatternBackdrop } from "@/components/shell/PatternBackdrop";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandK } from "@/components/search/CommandK";

/**
 * Shell for every signed-in screen. Navigation is a left icon rail on
 * desktop and a bottom tab bar on mobile (SideRail / BottomTabs handle
 * their own breakpoint, so only one is ever in the tree) — replacing the
 * single top bar, per the SEEN Redesign.
 *
 * The rail is a sibling of the scroll container rather than an overlay,
 * so a screen's own sticky headers stick to the top of the content area
 * and not underneath the chrome.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <PatternBackdrop />
        <div className="flex h-dvh overflow-hidden">
          <SideRail />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
            <BottomTabs />
          </div>
        </div>
        <CommandK />
      </ToastProvider>
    </QueryProvider>
  );
}
