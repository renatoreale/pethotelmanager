import {
  LayoutDashboard, FileText, CalendarCheck, Calendar, LogIn, LogOut,
  CreditCard, Users, Cat, ClipboardList, Shield, Mail, Building2,
  Power, Grid3X3, Settings2, PawPrint, BarChart3 } from
"lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, Resource } from "@/hooks/usePermissions";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar } from
"@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  resource: Resource;
}

const mainNav: NavItem[] = [
{ title: "Dashboard", url: "/", icon: LayoutDashboard, resource: "dashboard" },
{ title: "Preventivi", url: "/preventivi", icon: FileText, resource: "preventivi" },
{ title: "Prenotazioni", url: "/prenotazioni", icon: CalendarCheck, resource: "prenotazioni" },
{ title: "Appuntamenti", url: "/appuntamenti", icon: Calendar, resource: "appuntamenti" },
{ title: "Check-in", url: "/check-in", icon: LogIn, resource: "check-in" },
{ title: "Check-out", url: "/check-out", icon: LogOut, resource: "check-out" },
{ title: "Presenze", url: "/presenze", icon: PawPrint, resource: "presenze" },
{ title: "Pagamenti", url: "/pagamenti", icon: CreditCard, resource: "pagamenti" }];


const registryNav: NavItem[] = [
{ title: "Clienti", url: "/clienti", icon: Users, resource: "clienti" },
{ title: "Pets", url: "/gatti", icon: PawPrint, resource: "gatti" },
{ title: "Registro Pets", url: "/registro-gatti", icon: ClipboardList, resource: "registro-gatti" }];


const operationsNav: NavItem[] = [
{ title: "Occupazione Casette", url: "/occupazione", icon: Grid3X3, resource: "occupazione" },
{ title: "Statistiche", url: "/statistiche", icon: BarChart3, resource: "statistiche" }];


const adminNav: NavItem[] = [
{ title: "Utenti & Ruoli", url: "/utenti", icon: Shield, resource: "utenti" },
{ title: "Template Email", url: "/template-email", icon: Mail, resource: "template-email" },
{ title: "Pensione", url: "/pensione", icon: Building2, resource: "pensione" },
{ title: "Admin Sistema", url: "/admin", icon: Settings2, resource: "admin" }];


function NavGroup({ label, items, collapsed }: {label: string;items: NavItem[];collapsed: boolean;}) {
  const location = useLocation();
  const { isVisible } = usePermissions();

  const isActive = (path: string) =>
  path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  // Use isVisible instead of canRead for menu visibility
  const visibleItems = items.filter((item) => isVisible(item.resource));
  if (visibleItems.length === 0) return null;

  return (
    <SidebarGroup>
      {!collapsed &&
      <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-semibold">
          {label}
        </SidebarGroupLabel>
      }
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) =>
          <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink
                to={item.url}
                end={item.url === "/"}
                className="hover:bg-sidebar-accent/60"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>);

}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, signOut, user } = useAuth();
  const { primaryRole } = usePermissions();

  const initials = profile?.full_name ?
  profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) :
  user?.email?.slice(0, 2).toUpperCase() ?? "??";

  const roleLabel = primaryRole ?
  { admin: "Amministratore", ceo: "CEO", titolare: "Titolare", manager: "Manager", operatore: "Operatore" }[primaryRole] :
  "Utente";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-serif font-bold text-sm">
            🐾
          </div>
          {!collapsed &&
          <div className="flex flex-col">
              <span className="font-serif font-bold text-sm text-sidebar-foreground">
                Pet Hotel Manager 
              </span>
            </div>
          }
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavGroup label="Operatività" items={mainNav} collapsed={collapsed} />
        <NavGroup label="Anagrafica" items={registryNav} collapsed={collapsed} />
        <NavGroup label="Operazioni" items={operationsNav} collapsed={collapsed} />
        <NavGroup label="Amministrazione" items={adminNav} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary text-xs font-semibold">
            {initials}
          </div>
          {!collapsed &&
          <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.full_name ?? user?.email}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50">
                {roleLabel}
              </p>
            </div>
          }
          {!collapsed &&
          <button
            onClick={signOut}
            className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
            title="Esci">
            
              <Power className="h-4 w-4" />
            </button>
          }
        </div>
      </SidebarFooter>
    </Sidebar>);

}