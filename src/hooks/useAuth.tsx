import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase as baseClient } from "@/integrations/supabase/client";
import { useSupabase, useSupabaseClientInfo } from "@/hooks/useSupabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  trialExpired: boolean;
  trialEnd: string | null;
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
  const supabase = useSupabase();
  const { loading: clientLoading } = useSupabaseClientInfo();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (clientLoading) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setProfileLoading(true);
          setTimeout(async () => {
            await fetchProfileAndRoles(session.user);
            setProfileLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setUserTenants([]);
          setProfileLoading(false);
          setTrialExpired(false);
          setTrialEnd(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfileLoading(true);
        fetchProfileAndRoles(session.user).then(() => setProfileLoading(false));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, clientLoading]);

  async function fetchProfileAndRoles(authUser: User) {
    const userId = authUser.id;
    
    const [profileRes, rolesRes, tenantsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, tenant_id, avatar_url").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role, tenant_id").eq("user_id", userId),
      supabase.from("tenants").select("id, name"),
    ]);

    // If no roles and user has is_trial metadata, auto-provision
    if ((!rolesRes.data || rolesRes.data.length === 0) && authUser.user_metadata?.is_trial) {
      console.log("[useAuth] Trial user with no roles, provisioning...");
      try {
        const { data, error } = await baseClient.functions.invoke("provision-trial");
        if (error) {
          console.error("Provision trial error:", error);
        } else if (data?.success) {
          console.log("[useAuth] Trial provisioned, refetching...");
          // Refetch after provisioning
          const [p2, r2, t2] = await Promise.all([
            supabase.from("profiles").select("id, full_name, tenant_id, avatar_url").eq("user_id", userId).single(),
            supabase.from("user_roles").select("role, tenant_id").eq("user_id", userId),
            supabase.from("tenants").select("id, name"),
          ]);
          return applyProfileData(userId, p2, r2, t2);
        }
      } catch (e) {
        console.error("Provision trial exception:", e);
      }
    }

    await applyProfileData(userId, profileRes, rolesRes, tenantsRes);
  }

  async function applyProfileData(userId: string, profileRes: any, rolesRes: any, tenantsRes: any) {
    if (profileRes.data) {
      setProfile(profileRes.data);
    }

    const userRoles: UserRole[] = [];
    const tenantList: UserTenant[] = [];
    const tenantLookup = new Map(tenantsRes.data?.map((t: any) => [t.id, t.name]) || []);

    if (rolesRes.data) {
      for (const r of rolesRes.data) {
        const role = r.role as UserRole;
        if (!userRoles.includes(role)) userRoles.push(role);
        if (r.tenant_id && !tenantList.find(t => t.id === r.tenant_id)) {
          tenantList.push({
            id: r.tenant_id,
            name: (tenantLookup.get(r.tenant_id) as string) || "Pensione",
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

    // Check trial expiration
    const { data: trialData } = await supabase
      .from("trial_registrations")
      .select("trial_end, is_converted")
      .eq("user_id", userId)
      .maybeSingle();

    if (trialData && !trialData.is_converted) {
      setTrialEnd(trialData.trial_end);
      const now = new Date();
      const end = new Date(trialData.trial_end);
      if (now > end) {
        setTrialExpired(true);
        // Auto-ban the expired trial user
        try {
          await baseClient.functions.invoke("admin-ban-user", {
            body: { user_id: userId, ban: true, auto_expire: true },
          });
        } catch (e) {
          console.error("Failed to auto-ban expired trial user:", e);
        }
        toast.error("Il periodo di prova è scaduto. Il tuo account è stato disattivato. Contatta il supporto per attivare un abbonamento.", { duration: 10000 });
        // Sign out after a brief delay so user can see the message
        setTimeout(async () => {
          await supabase.auth.signOut();
        }, 3000);
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
    queryClient.invalidateQueries();
  }, [profile, queryClient, supabase]);

  const hasRole = (role: UserRole) => roles.includes(role);

  const activeTenant = userTenants.find((t) => t.id === profile?.tenant_id) || null;

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setUserTenants([]);
    setTrialExpired(false);
    setTrialEnd(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, loading, profileLoading, trialExpired, trialEnd,
      profile, roles, 
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
