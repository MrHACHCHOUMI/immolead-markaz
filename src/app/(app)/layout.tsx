import { AuthProvider } from "@/components/providers/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { RealtimeBridge } from "@/components/providers/RealtimeBridge";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="relative min-h-screen bg-[#071510] text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-0 h-[380px] w-[380px] rounded-full bg-[#1f8f63]/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[#c4a35a]/10 blur-3xl" />
        </div>
        <RealtimeBridge />
        <Sidebar />
        <div className="relative z-10 pl-60">
          <main className="min-h-screen">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
