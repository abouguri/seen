import { TopNav } from "@/components/shell/TopNav";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandK } from "@/components/search/CommandK";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <div className="flex h-dvh flex-col overflow-hidden">
          <TopNav />
          <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
        </div>
        <CommandK />
      </ToastProvider>
    </QueryProvider>
  );
}
