"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/dashboard/app-sidebar";

type DashboardShellProps = {
  children: ReactNode;
  showAdminLink: boolean;
};

export function DashboardShell({ children, showAdminLink }: DashboardShellProps) {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      {/* Top navbar — full width */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-12 shrink-0 items-center border-b border-border/60 bg-background px-4">
        <Link href="/">
          <Image
            src="/logo/restoOS-logo-transparent-2400.png"
            alt="RestoOs"
            width={220}
            height={56}
            className="object-contain"
          />
        </Link>
      </header>

      {/* Body */}
      <div className="relative flex flex-1 overflow-hidden pt-12">
        {/* Spacer: reserves the icon-width column so content never shifts */}
        <div className="w-12 shrink-0" aria-hidden />

        {/* Sidebar: fixed, floats over content */}
        <AppSidebar showAdminLink={showAdminLink} />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
