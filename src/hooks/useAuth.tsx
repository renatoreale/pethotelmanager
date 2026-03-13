import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type UserRole = "admin" | "ceo" | "titolare" | "manager" | "operatore";

interface UserTenant {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  profile: {
    id: string;
    full_name: string | null;
    tenant_id: string | null;
    avatar_url: string | null;
  } | null;
  roles: UserRole[];
  userTenants: UserTenant[];
  activeTenant: UserTenant | null;
  hasRole: (role: UserRole) => boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setProfileLoading(true);
          setTimeout(async () => {
            await fetchProfileAndRoles(session.user.id);
            setProfileLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setUserTenants([]);
          setProfileLoading(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfileAndRoles(userId: string) {
    const [profileRes, rolesRes, tenantsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, tenant_id, avatar_url").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role, tenant_id").eq("user_id", userId),
      supabase.from("tenants").select("id, name"),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
    }

    // Each user has a single role (simplified model)
    const userRoles: UserRole[] = [];
    const tenantList: UserTenant[] = [];
    const tenantLookup = new Map(tenantsRes.data?.map((t) => [t.id, t.name]) || []);

    if (rolesRes.data) {
      for (const r of rolesRes.data) {
        const role = r.role as UserRole;
        if (!userRoles.includes(role)) userRoles.push(role);
        if (r.tenant_id && !tenantList.find(t => t.id === r.tenant_id)) {
          tenantList.push({
            id: r.tenant_id,
            name: tenantLookup.get(r.tenant_id) || "Pensione",
          });
        }
      }
    }

    setUserTenants(tenantList);
    setRoles(userRoles);

    // Auto-select first tenant if none is active
    let activeTenantId = profileRes.data?.tenant_id;
    if (!activeTenantId && tenantList.length > 0) {
      activeTenantId = tenantList[0].id;
      if (profileRes.data) {
        await supabase
          .from("profiles")
          .update({ tenant_id: activeTenantId })
          .eq("id", profileRes.data.id);
        setProfile({ ...profileRes.data, tenant_id: activeTenantId });
      }
    }
  }

  const switchTenant = useCallback(async (tenantId: string) => {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({ tenant_id: tenantId })
      .eq("id", profile.id);

    if (error) {
      console.error("Error switching tenant:", error);
      return;
    }

    setProfile({ ...profile, tenant_id: tenantId });
    // Invalidate all queries so they refetch with the new tenant context
    queryClient.invalidateQueries();
  }, [profile, queryClient]);

  const hasRole = (role: UserRole) => roles.includes(role);

  const activeTenant = userTenants.find((t) => t.id === profile?.tenant_id) || null;

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setUserTenants([]);
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, loading, profile, roles, 
      userTenants, activeTenant,
      hasRole, switchTenant, signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
