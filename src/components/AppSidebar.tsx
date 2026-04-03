import {
  LayoutDashboard, FileText, CalendarCheck, Calendar, LogIn, LogOut,
  CreditCard, Users, Cat, ClipboardList, Shield, Mail, Building2,
  Power, Grid3X3, Settings2, PawPrint, BarChart3, LifeBuoy } from
"lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, Resource } from "@/hooks/usePermissions";
import { useTranslation } from "react-i18next";
import petHotelLogo from "@/assets/pethotelmanager_logo.png";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar } from
"@/components/ui/sidebar";

interface NavItem {
  titleKey: string;
  url: string;
  icon: any;
  resource: Resource;
}

const mainNav: NavItem[] = [
{ titleKey: "sidebar.dashboard", url: "/", icon: LayoutDashboard, resource: "dashboard" },
{ titleKey: "sidebar.quotes", url: "/preventivi", icon: FileText, resource: "preventivi" },
{ titleKey: "sidebar.bookings", url: "/prenotazioni", icon: CalendarCheck, resource: "prenotazioni" },
{ titleKey: "sidebar.appointments", url: "/appuntamenti", icon: Calendar, resource: "appuntamenti" },
{ titleKey: "sidebar.checkIn", url: "/check-in", icon: LogIn, resource: "check-in" },
{ titleKey: "sidebar.checkOut", url: "/check-out", icon: LogOut, resource: "check-out" },
{ titleKey: "sidebar.attendance", url: "/presenze", icon: PawPrint, resource: "presenze" },
{ titleKey: "sidebar.payments", url: "/pagamenti", icon: CreditCard, resource: "pagamenti" }];


const registryNav: NavItem[] = [
{ titleKey: "sidebar.clients", url: "/clienti", icon: Users, resource: "clienti" },
{ titleKey: "sidebar.pets", url: "/gatti", icon: PawPrint, resource: "gatti" },
{ titleKey: "sidebar.petRegistry", url: "/registro-gatti", icon: ClipboardList, resource: "registro-gatti" }];


const operationsNav: NavItem[] = [
{ titleKey: "sidebar.occupancy", url: "/occupazione", icon: Grid3X3, resource: "occupazione" },
{ titleKey: "sidebar.statistics", url: "/statistiche", icon: BarChart3, resource: "statistiche" }];


const adminNav: NavItem[] = [
{ titleKey: "sidebar.usersRoles", url: "/utenti", icon: Shield, resource: "utenti" },
{ titleKey: "sidebar.emailTemplates", url: "/template-email", icon: Mail, resource: "template-email" },
{ titleKey: "sidebar.pensione", url: "/pensione", icon: Building2, resource: "pensione" },
{ titleKey: "sidebar.supporto", url: "/supporto", icon: LifeBuoy, resource: "supporto" },
{ titleKey: "sidebar.systemAdmin", url: "/admin", icon: Settings2, resource: "admin" }];


function NavGroup({ label, items, collapsed }: {label: string;items: NavItem[];collapsed: boolean;}) {
  const location = useLocation();
  const { isVisible } = usePermissions();
  const { t } = useTranslation();
  const { isMobile, setOpenMobile } = useSidebar();

  const isActive = (path: string) =>
  path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const visibleItems = items.filter((item) => isVisible(item.resource));
  if (visibleItems.length === 0) return null;

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

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
          <SidebarMenuItem key={item.titleKey}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink
                to={item.url}
                end={item.url === "/"}
                className="hover:bg-sidebar-accent/60"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                onClick={handleNavClick}>

                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>{t(item.titleKey)}</span>}
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
  const { profile, signOut, user, trialEnd } = useAuth();
  const { primaryRole, isAdmin } = usePermissions();

  const isTrial = !isAdmin && (trialEnd !== null || user?.user_metadata?.is_trial === true);
  const visibleAdminNav = isTrial ? adminNav.filter((item) => item.resource !== "utenti") : adminNav;
  const { t } = useTranslation();

  const initials = profile?.full_name ?
  profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) :
  user?.email?.slice(0, 2).toUpperCase() ?? "??";

  const roleLabel = primaryRole
    ? t(`roles.${primaryRole}`)
    : t("roles.user");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 flex items-center justify-center">
        <img src={petHotelLogo} alt="Pet Hotel Manager" className="h-20 w-20 shrink-0 rounded-lg object-contain mx-auto" />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavGroup label={t("sidebar.operations")} items={mainNav} collapsed={collapsed} />
        <NavGroup label={t("sidebar.registry")} items={registryNav} collapsed={collapsed} />
        <NavGroup label={t("sidebar.operationsGroup")} items={operationsNav} collapsed={collapsed} />
        <NavGroup label={t("sidebar.administration")} items={visibleAdminNav} collapsed={collapsed} />
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
            title={t("common.logout")}>
            
              <Power className="h-4 w-4" />
            </button>
          }
        </div>
      </SidebarFooter>
    </Sidebar>);

}
