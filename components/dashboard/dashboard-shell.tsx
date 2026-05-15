"use client";

import type { ReactNode } from "react";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

type DashboardShellProps = {
  children: ReactNode;
  showAdminLink: boolean;
};

export function DashboardShell({ children, showAdminLink }: DashboardShellProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar showAdminLink={showAdminLink} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-card/50 px-4 backdrop-blur-sm">
          <SidebarTrigger />
        </header>
        <div className="flex flex-1 flex-col overflow-auto p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
