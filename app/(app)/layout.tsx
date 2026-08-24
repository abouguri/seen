import { Sidebar } from "@/components/shell/Sidebar";
import { TabBar } from "@/components/shell/TabBar";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandK } from "@/components/search/CommandK";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden md:pl-60">
            <MobileHeader />
            <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">{children}</main>
          </div>
          <TabBar />
        </div>
        <CommandK />
      </ToastProvider>
    </QueryProvider>
  );
}
