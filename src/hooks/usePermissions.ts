import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSupabase } from "@/hooks/useSupabaseClient";

export type Permission = "read" | "write" | "delete";
export type Resource = 
  | "dashboard"
  | "dashboard_revenue"
  | "preventivi"
  | "prenotazioni"
  | "appuntamenti"
  | "check-in"
  | "check-out"
  | "pagamenti"
  | "clienti"
  | "gatti"
  | "presenze"
  | "registro-gatti"
  | "planning"
  | "occupazione"
  | "statistiche"
  | "utenti"
  | "template-email"
  | "pensione"
  | "admin";

// Fallback permissions if DB has no entries
const ROLE_PERMISSIONS_FALLBACK: Record<string, Record<Resource, Permission[]>> = {
  admin: {
    dashboard: ["read", "write", "delete"],
    dashboard_revenue: ["read"],
    preventivi: ["read", "write", "delete"],
    prenotazioni: ["read", "write", "delete"],
    appuntamenti: ["read", "write", "delete"],
    "check-in": ["read", "write", "delete"],
    "check-out": ["read", "write", "delete"],
    pagamenti: ["read", "write", "delete"],
    clienti: ["read", "write", "delete"],
    gatti: ["read", "write", "delete"],
    presenze: ["read"],
    "registro-gatti": ["read", "write", "delete"],
    planning: ["read", "write", "delete"],
    occupazione: ["read", "write", "delete"],
    statistiche: ["read", "write", "delete"],
    utenti: ["read", "write", "delete"],
    "template-email": ["read", "write", "delete"],
    pensione: ["read", "write", "delete"],
    admin: ["read", "write", "delete"],
  },
  ceo: {
    dashboard: ["read"], dashboard_revenue: ["read"],
    preventivi: ["read"], prenotazioni: ["read"], appuntamenti: ["read"],
    "check-in": ["read"], "check-out": ["read"], pagamenti: ["read"],
    clienti: ["read"], gatti: ["read"], presenze: ["read"], "registro-gatti": ["read"],
    planning: ["read"], occupazione: ["read"], statistiche: ["read"], utenti: ["read"],
    "template-email": ["read"], pensione: ["read"], admin: [],
  },
  titolare: {
    dashboard: ["read", "write"], dashboard_revenue: ["read"],
    preventivi: ["read", "write", "delete"], prenotazioni: ["read", "write", "delete"],
    appuntamenti: ["read", "write", "delete"], "check-in": ["read", "write", "delete"],
    "check-out": ["read", "write", "delete"], pagamenti: ["read", "write", "delete"],
    clienti: ["read", "write", "delete"], gatti: ["read", "write", "delete"],
    presenze: ["read"], "registro-gatti": ["read", "write", "delete"], planning: ["read", "write", "delete"],
    occupazione: ["read", "write", "delete"], statistiche: ["read"], utenti: ["read", "write"],
    "template-email": ["read"], pensione: ["read", "write"], admin: [],
  },
  manager: {
    dashboard: ["read"], dashboard_revenue: ["read"],
    preventivi: ["read", "write"], prenotazioni: ["read", "write"],
    appuntamenti: ["read", "write"], "check-in": ["read", "write"],
    "check-out": ["read", "write"], pagamenti: ["read", "write"],
    clienti: ["read", "write"], gatti: ["read", "write"],
    presenze: ["read"], "registro-gatti": ["read"], planning: ["read", "write"],
    occupazione: ["read"], statistiche: ["read"], utenti: [], "template-email": [],
    pensione: [], admin: [],
  },
  operatore: {
    dashboard: ["read"], dashboard_revenue: [],
    preventivi: [], prenotazioni: [], appuntamenti: [],
    "check-in": ["read"], "check-out": ["read"], pagamenti: [],
    clienti: [], gatti: [], presenze: ["read"], "registro-gatti": [], planning: [],
    occupazione: [], statistiche: [], utenti: [], "template-email": [], pensione: [], admin: [],
  },
};

interface DbPermission {
  role: string;
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  is_visible: boolean;
}

export function usePermissions() {
  const supabase = useSupabase();
  const { roles, hasRole } = useAuth();

  // Load DB permissions
  const { data: dbPermissions } = useQuery({
    queryKey: ["role-permissions-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, resource, can_read, can_write, can_delete, is_visible");
      if (error) throw error;
      return data as DbPermission[];
    },
  });

  const primaryRole = useMemo(() => {
    const rolePriority = ["admin", "ceo", "titolare", "manager", "operatore"];
    for (const role of rolePriority) {
      if (roles.includes(role as any)) return role;
    }
    return null;
  }, [roles]);

  const can = (permission: Permission, resource: Resource): boolean => {
    if (!primaryRole) return false;

    // Check DB permissions first
    if (dbPermissions && dbPermissions.length > 0) {
      const dbPerm = dbPermissions.find(p => p.role === primaryRole && p.resource === resource);
      if (dbPerm) {
        if (permission === "read") return dbPerm.can_read;
        if (permission === "write") return dbPerm.can_write;
        if (permission === "delete") return dbPerm.can_delete;
      }
    }

    // Fallback to hardcoded
    const rolePerms = ROLE_PERMISSIONS_FALLBACK[primaryRole];
    if (!rolePerms) return false;
    const resourcePerms = rolePerms[resource];
    if (!resourcePerms) return false;
    return resourcePerms.includes(permission);
  };

  const isVisible = (resource: Resource): boolean => {
    if (!primaryRole) return false;
    // Admin always sees everything
    if (primaryRole === "admin") return true;

    if (dbPermissions && dbPermissions.length > 0) {
      const dbPerm = dbPermissions.find(p => p.role === primaryRole && p.resource === resource);
      if (dbPerm) return dbPerm.is_visible;
    }
    // Fallback: visible if can_read
    return canRead(resource);
  };

  const canRead = (resource: Resource): boolean => can("read", resource);
  const canWrite = (resource: Resource): boolean => can("write", resource);
  const canDelete = (resource: Resource): boolean => can("delete", resource);
  const canAccessPage = (page: Resource): boolean => canRead(page);

  const isAdmin = hasRole("admin");
  const isCeo = hasRole("ceo");
  const isTitolare = hasRole("titolare");
  const isManager = hasRole("manager");
  const isOperatore = hasRole("operatore");
  const canAccessAllTenants = isAdmin || isCeo;
  const isOperatoreRestricted = isOperatore && !isAdmin && !isCeo && !isTitolare && !isManager;

  return {
    can, canRead, canWrite, canDelete, canAccessPage,
    isVisible,
    primaryRole,
    isAdmin, isCeo, isTitolare, isManager, isOperatore,
    canAccessAllTenants, isOperatoreRestricted,
  };
}
