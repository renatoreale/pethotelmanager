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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

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

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Preventivi", url: "/preventivi", icon: FileText },
  { title: "Prenotazioni", url: "/prenotazioni", icon: CalendarCheck },
  { title: "Appuntamenti", url: "/appuntamenti", icon: Calendar },
  { title: "Check-in", url: "/check-in", icon: LogIn },
  { title: "Check-out", url: "/check-out", icon: LogOut },
  { title: "Pagamenti", url: "/pagamenti", icon: CreditCard },
];

const registryNav = [
  { title: "Clienti", url: "/clienti", icon: Users },
  { title: "Gatti", url: "/gatti", icon: Cat },
  { title: "Registro Gatti", url: "/registro-gatti", icon: ClipboardList },
];

const operationsNav = [
  { title: "Planning", url: "/planning", icon: Calendar },
  { title: "Occupazione Casette", url: "/occupazione", icon: Grid3X3 },
];

const adminNav = [
  { title: "Utenti & Ruoli", url: "/utenti", icon: Shield },
  { title: "Template Email", url: "/template-email", icon: Mail },
  { title: "Pensione", url: "/pensione", icon: Building2 },
  { title: "Admin Sistema", url: "/admin", icon: Settings2 },
];

function NavGroup({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: typeof mainNav;
  collapsed: boolean;
}) {
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-semibold">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
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
  const { profile, roles, signOut, user } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

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
              <button className="flex items-center gap-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
                Pensione Milano
                <ChevronDown className="h-3 w-3" />
              </button>
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
              <p className="text-[10px] text-sidebar-foreground/50 capitalize">
                {roles[0] ?? "utente"}
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
