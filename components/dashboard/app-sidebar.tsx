"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BotMessageSquareIcon,
  FileDownIcon,
  FileTextIcon,
  HomeIcon,
  LogOutIcon,
  PlugIcon,
  ShieldIcon,
  SparklesIcon,
  UtensilsCrossedIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navMain = [
  { href: "/dashboard/stats", label: "Statistiques", icon: BarChart3Icon, tooltip: "Statistiques" },
  { href: "/dashboard/assistant", label: "Assistant IA", icon: BotMessageSquareIcon, tooltip: "Assistant IA" },
  { href: "/dashboard/pricing-suggestions", label: "Suggestions de prix", icon: SparklesIcon, tooltip: "Suggestions de prix" },
  { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossedIcon, tooltip: "Menu" },
  { href: "/dashboard/export", label: "Export CSV", icon: FileDownIcon, tooltip: "Export CSV menu" },
] as const;

type AppSidebarProps = {
  showAdminLink: boolean;
};

export function AppSidebar({ showAdminLink }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="gap-0">
        <SidebarGroup className="p-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.tooltip}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup className="p-2">
          <SidebarGroupLabel>Intégrations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/integrations/square")}
                  tooltip="Square"
                >
                  <Link href="/dashboard/integrations/square">
                    <PlugIcon />
                    <span>Square</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/integrations/client-invoices")}
                  tooltip="Factures clients"
                >
                  <Link href="/dashboard/integrations/client-invoices">
                    <FileTextIcon />
                    <span>Factures clients</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Accueil">
              <Link href="/">
                <HomeIcon />
                <span>Accueil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {showAdminLink ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Admin scraping">
                <Link href="/admin/scraping">
                  <ShieldIcon />
                  <span>Admin scraping</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <form action="/auth/logout" method="post" className="w-full">
              <SidebarMenuButton type="submit" tooltip="Déconnexion" className="w-full">
                <LogOutIcon />
                <span>Déconnexion</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
