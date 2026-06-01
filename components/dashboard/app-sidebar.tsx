"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  BarChart3Icon,
  BotMessageSquareIcon,
  FileDownIcon,
  FileTextIcon,
  LogOutIcon,
  PlugIcon,
  ShieldIcon,
  SparklesIcon,
  UtensilsCrossedIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navMain = [
  { href: "/dashboard/stats", label: "Statistiques", icon: BarChart3Icon },
  { href: "/dashboard/pricing-suggestions", label: "Suggestions de prix", icon: SparklesIcon },
  { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossedIcon },
  { href: "/dashboard/assistant", label: "Assistant IA", icon: BotMessageSquareIcon },
] as const;

const navIntegrations = [
  { href: "/dashboard/integrations/sales-csv", label: "Import ventes", icon: PlugIcon, exact: false },
  { href: "/dashboard/integrations/supplier-invoices", label: "Factures fournisseur", icon: FileTextIcon, exact: false },
  { href: "/dashboard/export", label: "Export menu", icon: FileDownIcon },
] as const;

type AppSidebarProps = {
  showAdminLink: boolean;
};

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  isOpen,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  isOpen: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span
        className={cn(
          "whitespace-nowrap overflow-hidden transition-all duration-200",
          isOpen ? "opacity-100 w-auto" : "w-0 opacity-0",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function AppSidebar({ showAdminLink }: AppSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleMouseEnter() {
    clearTimeout(closeTimer.current);
    setIsOpen(true);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setIsOpen(false), 150);
  }

  return (
    <div
      className={cn(
        "fixed left-0 top-12 bottom-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar",
        "transition-[width] duration-200 ease-in-out overflow-hidden",
        isOpen ? "w-56" : "w-12",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-hidden p-2">
        {navMain.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.href}
            isOpen={isOpen}
          />
        ))}

        {/* Separator + integrations */}
        <div className="my-2 h-px bg-sidebar-border" />

        {navIntegrations.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname.startsWith(item.href)}
            isOpen={isOpen}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-0.5 border-t border-sidebar-border p-2">
        {showAdminLink && (
          <NavItem
            href="/admin/scraping"
            label="Admin"
            icon={ShieldIcon}
            isActive={pathname.startsWith("/admin")}
            isOpen={isOpen}
          />
        )}
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/70",
            )}
          >
            <LogOutIcon className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap overflow-hidden transition-all duration-200",
                isOpen ? "opacity-100 w-auto" : "w-0 opacity-0",
              )}
            >
              Déconnexion
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
