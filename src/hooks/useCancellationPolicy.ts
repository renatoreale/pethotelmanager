import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface CancellationRule {
  id?: string;
  policy_id?: string;
  days_before_checkin: number;
  refund_percentage: number;
}

export interface CancellationPolicy {
  id: string;
  tenant_id: string | null;
  admin_fee: number;
  rules: CancellationRule[];
}

// ── Tenant cancellation policy ──
export function useCancellationPolicy() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["cancellation-policy", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      const { data: policy, error } = await supabase
        .from("cancellation_policies" as any)
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (error) throw error;
      if (!policy) return null;
      const policyObj = policy as any;

      const { data: rules, error: rulesErr } = await supabase
        .from("cancellation_policy_rules" as any)
        .select("*")
        .eq("policy_id", (policy as any).id)
        .order("days_before_checkin", { ascending: false });
      if (rulesErr) throw rulesErr;

      return { id: policyObj.id, tenant_id: policyObj.tenant_id, admin_fee: policyObj.admin_fee, rules: (rules || []) as unknown as CancellationRule[] } as CancellationPolicy;
    },
    enabled: !!profile?.tenant_id,
  });
}

// ── Global cancellation policy ──
export function useGlobalCancellationPolicy() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["global-cancellation-policy"],
    queryFn: async () => {
      const { data: policy, error } = await supabase
        .from("cancellation_policies" as any)
        .select("*")
        .is("tenant_id", null)
        .maybeSingle();
      if (error) throw error;
      if (!policy) return null;

      const { data: rules, error: rulesErr } = await supabase
        .from("cancellation_policy_rules" as any)
        .select("*")
        .eq("policy_id", (policy as any).id)
        .order("days_before_checkin", { ascending: false });
      if (rulesErr) throw rulesErr;

      const p = policy as any;
      return { id: p.id, tenant_id: p.tenant_id, admin_fee: p.admin_fee, rules: (rules || []) as unknown as CancellationRule[] } as CancellationPolicy;
    },
  });
}

// ── Save full policy (upsert policy + sync rules) ──
export function useSaveCancellationPolicy() {
  const qc = useQueryClient();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async ({
      tenantId,
      adminFee,
      rules,
    }: {
      tenantId: string | null;
      adminFee: number;
      rules: CancellationRule[];
    }) => {
      let policyId: string;
      const filter = tenantId
        ? supabase.from("cancellation_policies" as any).select("id").eq("tenant_id", tenantId).maybeSingle()
        : supabase.from("cancellation_policies" as any).select("id").is("tenant_id", null).maybeSingle();

      const { data: existing } = await filter;

      if (existing) {
        policyId = (existing as any).id;
        await supabase
          .from("cancellation_policies" as any)
          .update({ admin_fee: adminFee, updated_at: new Date().toISOString() } as any)
          .eq("id", policyId);
      } else {
        const { data, error } = await supabase
          .from("cancellation_policies" as any)
          .insert({ tenant_id: tenantId, admin_fee: adminFee } as any)
          .select("id")
          .single();
        if (error) throw error;
        policyId = (data as any).id;
      }

      await supabase
        .from("cancellation_policy_rules" as any)
        .delete()
        .eq("policy_id", policyId);

      if (rules.length > 0) {
        const rows = rules.map((r) => ({
          policy_id: policyId,
          days_before_checkin: r.days_before_checkin,
          refund_percentage: r.refund_percentage,
        }));
        const { error: insertErr } = await supabase
          .from("cancellation_policy_rules" as any)
          .insert(rows as any);
        if (insertErr) throw insertErr;
      }

      return policyId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cancellation-policy"] });
      qc.invalidateQueries({ queryKey: ["global-cancellation-policy"] });
    },
  });
}
