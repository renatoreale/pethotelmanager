import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";

export type Permission = "read" | "write" | "delete";
export type Resource = 
  | "dashboard"
  | "dashboard_revenue" // Widget incassi nella dashboard
  | "preventivi"
  | "prenotazioni"
  | "appuntamenti"
  | "check-in"
  | "check-out"
  | "pagamenti"
  | "clienti"
  | "gatti"
  | "registro-gatti"
  | "planning"
  | "occupazione"
  | "utenti"
  | "template-email"
  | "pensione"
  | "admin";

// Definizione permessi per ruolo
const ROLE_PERMISSIONS: Record<string, Record<Resource, Permission[]>> = {
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
    "registro-gatti": ["read", "write", "delete"],
    planning: ["read", "write", "delete"],
    occupazione: ["read", "write", "delete"],
    utenti: ["read", "write", "delete"],
    "template-email": ["read", "write", "delete"],
    pensione: ["read", "write", "delete"],
    admin: ["read", "write", "delete"],
  },
  ceo: {
    dashboard: ["read"],
    dashboard_revenue: ["read"],
    preventivi: ["read"],
    prenotazioni: ["read"],
    appuntamenti: ["read"],
    "check-in": ["read"],
    "check-out": ["read"],
    pagamenti: ["read"],
    clienti: ["read"],
    gatti: ["read"],
    "registro-gatti": ["read"],
    planning: ["read"],
    occupazione: ["read"],
    utenti: ["read"],
    "template-email": ["read"],
    pensione: ["read"],
    admin: [],
  },
  titolare: {
    dashboard: ["read", "write"],
    dashboard_revenue: ["read"],
    preventivi: ["read", "write", "delete"],
    prenotazioni: ["read", "write", "delete"],
    appuntamenti: ["read", "write", "delete"],
    "check-in": ["read", "write", "delete"],
    "check-out": ["read", "write", "delete"],
    pagamenti: ["read", "write", "delete"],
    clienti: ["read", "write", "delete"],
    gatti: ["read", "write", "delete"],
    "registro-gatti": ["read", "write", "delete"],
    planning: ["read", "write", "delete"],
    occupazione: ["read", "write", "delete"],
    utenti: ["read", "write"],
    "template-email": ["read"],
    pensione: ["read", "write"],
    admin: [],
  },
  manager: {
    dashboard: ["read"],
    dashboard_revenue: ["read"],
    preventivi: ["read", "write"],
    prenotazioni: ["read", "write"],
    appuntamenti: ["read", "write"],
    "check-in": ["read", "write"],
    "check-out": ["read", "write"],
    pagamenti: ["read", "write"],
    clienti: ["read", "write"],
    gatti: ["read", "write"],
    "registro-gatti": ["read"],
    planning: ["read", "write"],
    occupazione: ["read"],
    utenti: [],
    "template-email": [],
    pensione: [],
    admin: [],
  },
  operatore: {
    dashboard: ["read"],
    dashboard_revenue: [], // NO revenue visibility
    preventivi: [],
    prenotazioni: [],
    appuntamenti: [],
    "check-in": ["read"], // Solo oggi e domani
    "check-out": ["read"], // Solo oggi e domani
    pagamenti: [],
    clienti: [],
    gatti: [],
    "registro-gatti": [],
    planning: [],
    occupazione: [],
    utenti: [],
    "template-email": [],
    pensione: [],
    admin: [],
  },
};

export function usePermissions() {
  const { roles, hasRole } = useAuth();

  // Get the highest priority role
  const primaryRole = useMemo(() => {
    const rolePriority = ["admin", "ceo", "titolare", "manager", "operatore"];
    for (const role of rolePriority) {
      if (roles.includes(role as any)) {
        return role;
      }
    }
    return null;
  }, [roles]);

  const can = (permission: Permission, resource: Resource): boolean => {
    if (!primaryRole) return false;
    
    const rolePerms = ROLE_PERMISSIONS[primaryRole];
    if (!rolePerms) return false;
    
    const resourcePerms = rolePerms[resource];
    if (!resourcePerms) return false;
    
    return resourcePerms.includes(permission);
  };

  const canRead = (resource: Resource): boolean => can("read", resource);
  const canWrite = (resource: Resource): boolean => can("write", resource);
  const canDelete = (resource: Resource): boolean => can("delete", resource);

  // Check if user can access a specific page/route
  const canAccessPage = (page: Resource): boolean => canRead(page);

  // Special checks
  const isAdmin = hasRole("admin");
  const isCeo = hasRole("ceo");
  const isTitolare = hasRole("titolare");
  const isManager = hasRole("manager");
  const isOperatore = hasRole("operatore");

  // CEO/Admin can access all tenants
  const canAccessAllTenants = isAdmin || isCeo;

  // Operatore can only see today and tomorrow check-in/out
  const isOperatoreRestricted = isOperatore && !isAdmin && !isCeo && !isTitolare && !isManager;

  return {
    can,
    canRead,
    canWrite,
    canDelete,
    canAccessPage,
    primaryRole,
    isAdmin,
    isCeo,
    isTitolare,
    isManager,
    isOperatore,
    canAccessAllTenants,
    isOperatoreRestricted,
  };
}
