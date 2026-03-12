import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClienteProfile, useClienteTenant } from "@/hooks/useClienteAuth";
import {
  LayoutDashboard, User, PawPrint, FileText, FilePlus, Power, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", to: "/cliente", icon: LayoutDashboard, end: true },
  { label: "Il Mio Profilo", to: "/cliente/profilo", icon: User },
  { label: "I Miei Animali", to: "/cliente/animali", icon: PawPrint },
  { label: "Preventivi", to: "/cliente/preventivi", icon: FileText },
  { label: "Richiedi Preventivo", to: "/cliente/richiedi-preventivo", icon: FilePlus },
];

export function ClienteLayout() {
  const { signOut } = useAuth();
  const { data: clientProfile } = useClienteProfile();
  const { data: tenant } = useClienteTenant();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              🐾
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {tenant?.name || "Pet Hotel"}
            </p>
            <p className="text-[10px] text-muted-foreground">Area Clienti</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              isActive(item.to, item.end)
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold">
            {clientProfile?.first_name?.[0]}{clientProfile?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {clientProfile?.first_name} {clientProfile?.last_name}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {clientProfile?.email}
            </p>
          </div>
          <button
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Esci"
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-border/50 bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile header + drawer */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border/50 bg-card">
          <div className="flex items-center gap-2">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <span className="text-xl">🐾</span>
            )}
            <span className="font-semibold text-sm">{tenant?.name || "Pet Hotel"}</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
            <aside
              className="w-64 h-full bg-card border-r border-border/50 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
