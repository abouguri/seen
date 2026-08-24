import { Sidebar } from "@/components/shell/Sidebar";
import { TabBar } from "@/components/shell/TabBar";
import { MobileHeader } from "@/components/shell/MobileHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar />
      <div className="flex flex-1 flex-col md:pl-60">
        <MobileHeader />
        <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
      </div>
      <TabBar />
    </div>
  );
}
