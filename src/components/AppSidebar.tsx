import {
  LayoutDashboard,
  FileText,
  CalendarCheck,
  Calendar,
  LogIn,
  LogOut,
  CreditCard,
  Users,
  Cat,
  ClipboardList,
  Shield,
  Mail,
  Building2,
  ChevronDown,
  Power,
  Grid3X3,
  Settings2,
  Check,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, Resource } from "@/hooks/usePermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

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
  { title: "Pagamenti", url: "/pagamenti", icon: CreditCard, resource: "pagamenti" },
];

const registryNav: NavItem[] = [
  { title: "Clienti", url: "/clienti", icon: Users, resource: "clienti" },
  { title: "Gatti", url: "/gatti", icon: Cat, resource: "gatti" },
  { title: "Registro Gatti", url: "/registro-gatti", icon: ClipboardList, resource: "registro-gatti" },
];

const operationsNav: NavItem[] = [
  { title: "Planning", url: "/planning", icon: Calendar, resource: "planning" },
  { title: "Occupazione Casette", url: "/occupazione", icon: Grid3X3, resource: "occupazione" },
];

const adminNav: NavItem[] = [
  { title: "Utenti & Ruoli", url: "/utenti", icon: Shield, resource: "utenti" },
  { title: "Template Email", url: "/template-email", icon: Mail, resource: "template-email" },
  { title: "Pensione", url: "/pensione", icon: Building2, resource: "pensione" },
  { title: "Admin Sistema", url: "/admin", icon: Settings2, resource: "admin" },
];

function NavGroup({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  const location = useLocation();
  const { canRead } = usePermissions();
  
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const visibleItems = items.filter(item => canRead(item.resource));

  if (visibleItems.length === 0) return null;

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-semibold">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
              >
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="hover:bg-sidebar-accent/60"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, roles, signOut, user, userTenants, activeTenant, switchTenant } = useAuth();
  const { primaryRole } = usePermissions();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  const roleLabel = primaryRole 
    ? { admin: "Amministratore", ceo: "CEO", titolare: "Titolare", manager: "Manager", operatore: "Operatore" }[primaryRole] 
    : "Utente";

  const hasMultipleTenants = userTenants.length > 1;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-serif font-bold text-sm">
            🐾
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-serif font-bold text-sm text-sidebar-foreground">
                CatHotel
              </span>
              {hasMultipleTenants ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors text-left">
                      {activeTenant?.name || "Seleziona pensione"}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {userTenants.map((tenant) => (
                      <DropdownMenuItem
                        key={tenant.id}
                        onClick={() => switchTenant(tenant.id)}
                        className="flex items-center justify-between"
                      >
                        <span>{tenant.name}</span>
                        {tenant.id === activeTenant?.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-[11px] text-sidebar-foreground/60">
                  {activeTenant?.name || "Pensione"}
                </span>
              )}
            </div>
          )}
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
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.full_name ?? user?.email}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50">
                {roleLabel}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={signOut}
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
              title="Esci"
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
