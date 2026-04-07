import type { ReactNode } from "react";
import { ChatWidget } from "@/components/ChatWidget";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <ChatWidget apiUrl={process.env.NEXT_PUBLIC_API_URL} />
    </>
  );
}
