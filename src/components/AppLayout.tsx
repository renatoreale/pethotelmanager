import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAllTenants } from "@/hooks/useAdmin";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const { profile, activeTenant, userTenants, switchTenant } = useAuth();
  const { isAdmin, isManager, isTitolare } = usePermissions();
  const { data: allTenants } = useAllTenants();

  const { isCeo } = usePermissions();
  // Admin/CEO see ALL tenants, titolare sees their associated tenants, manager sees only their own (no switcher)
  const tenantOptions = (isAdmin || isCeo) ? (allTenants || []) : userTenants.map(t => ({ id: t.id, name: t.name }));
  const showTenantSwitcher = tenantOptions.length > 1 && (isAdmin || isCeo || isTitolare);
  // Resolve active tenant name from options (covers admin selecting tenants they don't have roles for)
  const currentTenant = tenantOptions.find(t => t.id === profile?.tenant_id) || activeTenant;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-4 border-b bg-card/50 px-4 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            
            {showTenantSwitcher ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="max-w-[250px] truncate font-semibold">
                      {currentTenant?.name || "Seleziona pensione"}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {tenantOptions.map((tenant) => (
                    <DropdownMenuItem
                      key={tenant.id}
                      onClick={() => switchTenant(tenant.id)}
                      className="flex items-center justify-between"
                    >
                      <span>{tenant.name}</span>
                      {tenant.id === profile?.tenant_id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : currentTenant ? (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{currentTenant.name}</span>
              </div>
            ) : null}

            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
