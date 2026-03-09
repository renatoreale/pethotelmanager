import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// ── TENANTS ──
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  num_singole: number;
  num_doppie: number;
  occupancy_rule_days: number;
  stay_calc_type: string;
  count_checkin_day: boolean;
  count_checkout_day: boolean;
  created_at: string;
}

export function useAllTenants() {
  return useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tenant[];
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tenant: {
      name: string;
      slug: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      num_singole?: number;
      num_doppie?: number;
    }) => {
      const { data, error } = await supabase
        .from("tenants")
        .insert(tenant)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Pensione creata con successo");
    },
    onError: (error: any) => {
      toast.error("Errore nella creazione: " + error.message);
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tenant> & { id: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      qc.invalidateQueries({ queryKey: ["tenant-config"] });
      toast.success("Pensione aggiornata con successo");
    },
    onError: (error: any) => {
      toast.error("Errore nell'aggiornamento: " + error.message);
    },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Pensione eliminata");
    },
    onError: (error: any) => {
      toast.error("Errore nell'eliminazione: " + error.message);
    },
  });
}

// ── ALL USERS (Admin only - cross-tenant) ──
export interface UserWithProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  tenant_id: string | null;
  role: AppRole | null;
  role_id: string | null;
  tenant_name?: string | null;
}

export function useAllUsers() {
  return useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");
      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map((p) => p.user_id);

      // Get roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .in("user_id", userIds);
      if (rolesError) throw rolesError;

      // Get tenants for names
      const { data: tenants } = await supabase.from("tenants").select("id, name");

      return profiles.map((p) => {
        const userRole = roles?.find((r) => r.user_id === p.user_id);
        const tenant = tenants?.find((t) => t.id === p.tenant_id);
        return {
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          tenant_id: p.tenant_id,
          role: userRole?.role || null,
          role_id: userRole?.id || null,
          tenant_name: tenant?.name || null,
        } as UserWithProfile;
      });
    },
  });
}

export function useAssignUserToTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profileId,
      tenantId,
    }: {
      profileId: string;
      tenantId: string | null;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ tenant_id: tenantId })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Utente assegnato con successo");
    },
    onError: (error: any) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      role,
      tenantId,
      existingRoleId,
    }: {
      userId: string;
      role: AppRole;
      tenantId: string | null;
      existingRoleId: string | null;
    }) => {
      if (existingRoleId) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role, tenant_id: tenantId })
          .eq("id", existingRoleId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Ruolo aggiornato con successo");
    },
    onError: (error: any) => {
      toast.error("Errore: " + error.message);
    },
  });
}

// ── ROLE PERMISSIONS ──
export interface RolePermission {
  id: string;
  role: AppRole;
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  tenant_id: string | null;
}

export const RESOURCES = [
  { value: "dashboard", label: "Dashboard" },
  { value: "preventivi", label: "Preventivi" },
  { value: "prenotazioni", label: "Prenotazioni" },
  { value: "appuntamenti", label: "Appuntamenti" },
  { value: "check-in", label: "Check-in" },
  { value: "check-out", label: "Check-out" },
  { value: "pagamenti", label: "Pagamenti" },
  { value: "clienti", label: "Clienti" },
  { value: "gatti", label: "Gatti" },
  { value: "registro-gatti", label: "Registro Gatti" },
  { value: "planning", label: "Planning" },
  { value: "occupazione", label: "Occupazione Casette" },
  { value: "utenti", label: "Utenti & Ruoli" },
  { value: "template-email", label: "Template Email" },
  { value: "pensione", label: "Configurazione Pensione" },
  { value: "admin", label: "Amministrazione Sistema" },
];

export const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "ceo", label: "CEO" },
  { value: "titolare", label: "Titolare" },
  { value: "manager", label: "Manager" },
  { value: "operatore", label: "Operatore" },
];

export function useRolePermissions() {
  return useQuery({
    queryKey: ["admin-role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("role")
        .order("resource");
      if (error) throw error;
      return data as RolePermission[];
    },
  });
}

export function useUpsertRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (permission: {
      id?: string;
      role: AppRole;
      resource: string;
      can_read: boolean;
      can_write: boolean;
      can_delete: boolean;
      tenant_id?: string | null;
    }) => {
      // Check if exists
      let query = supabase
        .from("role_permissions")
        .select("id")
        .eq("role", permission.role)
        .eq("resource", permission.resource);
      
      if (permission.tenant_id) {
        query = query.eq("tenant_id", permission.tenant_id);
      } else {
        query = query.is("tenant_id", null);
      }
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("role_permissions")
          .update({
            can_read: permission.can_read,
            can_write: permission.can_write,
            can_delete: permission.can_delete,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("role_permissions").insert({
          role: permission.role,
          resource: permission.resource,
          can_read: permission.can_read,
          can_write: permission.can_write,
          can_delete: permission.can_delete,
          tenant_id: permission.tenant_id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-role-permissions"] });
      toast.success("Permesso aggiornato");
    },
    onError: (error: any) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useBulkUpsertPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (permissions: RolePermission[]) => {
      for (const perm of permissions) {
        let checkQuery = supabase
          .from("role_permissions")
          .select("id")
          .eq("role", perm.role)
          .eq("resource", perm.resource);
        
        if (perm.tenant_id) {
          checkQuery = checkQuery.eq("tenant_id", perm.tenant_id);
        } else {
          checkQuery = checkQuery.is("tenant_id", null);
        }
        const { data: existing } = await checkQuery.maybeSingle();

        if (existing) {
          await supabase
            .from("role_permissions")
            .update({
              can_read: perm.can_read,
              can_write: perm.can_write,
              can_delete: perm.can_delete,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("role_permissions").insert({
            role: perm.role,
            resource: perm.resource,
            can_read: perm.can_read,
            can_write: perm.can_write,
            can_delete: perm.can_delete,
            tenant_id: perm.tenant_id,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-role-permissions"] });
      toast.success("Permessi salvati con successo");
    },
    onError: (error: any) => {
      toast.error("Errore nel salvataggio: " + error.message);
    },
  });
}

// ── CREATE USER (via Edge Function) ──
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      full_name: string;
      tenant_id: string | null;
      role: AppRole;
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: userData,
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Utente creato con successo");
    },
    onError: (error: any) => {
      toast.error("Errore nella creazione utente: " + error.message);
    },
  });
}

// ── UPDATE USER PROFILE ──
export function useUpdateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, full_name }: { profileId: string; full_name: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profilo aggiornato con successo");
    },
    onError: (error: any) => {
      toast.error("Errore nell'aggiornamento: " + error.message);
    },
  });
}

// ── DELETE USER (via Edge Function) ──
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Utente eliminato con successo");
    },
    onError: (error: any) => {
      toast.error("Errore nell'eliminazione: " + error.message);
    },
  });
}
