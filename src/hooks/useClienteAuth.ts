import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ClienteProfile {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  fiscal_code: string | null;
  address: string | null;
  notes: string | null;
  is_blacklisted: boolean;
}

export function useClienteProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cliente-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("id, tenant_id, first_name, last_name, email, phone, fiscal_code, address, notes, is_blacklisted")
        .eq("user_id" as any, user.id)
        .maybeSingle();
      if (error) throw error;
      return data as ClienteProfile | null;
    },
    enabled: !!user,
  });
}

export function useUpdateClienteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClienteProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cliente-profile"] });
    },
  });
}

export function useClienteCats() {
  const { data: clientProfile } = useClienteProfile();
  return useQuery({
    queryKey: ["cliente-cats", clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile) return [];
      const { data, error } = await supabase
        .from("cats")
        .select("*")
        .eq("client_id", clientProfile.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!clientProfile?.id,
  });
}

export function useCreateClienteCat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cat: any) => {
      const { data, error } = await supabase
        .from("cats")
        .insert(cat)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cliente-cats"] }),
  });
}

export function useUpdateClienteCat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("cats")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cliente-cats"] }),
  });
}

export function useDeleteClienteCat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cliente-cats"] }),
  });
}

export function useClienteBookings() {
  const { data: clientProfile } = useClienteProfile();
  return useQuery({
    queryKey: ["cliente-bookings", clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile) return [];
      // Expire preventivi past validity for this tenant
      await supabase.rpc("expire_preventivi", { _tenant_id: clientProfile.tenant_id });
      const { data, error } = await supabase
        .from("bookings")
        .select("*, booking_cats(cat_id, cats(name)), payments(amount, payment_type)")
        .eq("client_id", clientProfile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientProfile?.id,
  });
}

export function useClienteAppointments() {
  const { data: clientProfile } = useClienteProfile();
  return useQuery({
    queryKey: ["cliente-appointments", clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*, bookings(booking_number, check_in_date, check_out_date)")
        .in("booking_id", 
          (await supabase
            .from("bookings")
            .select("id")
            .eq("client_id", clientProfile.id)
          ).data?.map((b: any) => b.id) || []
        )
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!clientProfile?.id,
  });
}

export function useClienteTenant() {
  const { data: clientProfile } = useClienteProfile();
  return useQuery({
    queryKey: ["cliente-tenant", clientProfile?.tenant_id],
    queryFn: async () => {
      if (!clientProfile?.tenant_id) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, logo_url, phone, email, address, city, cap, iban, bank_name, iban_holder, pet_type, stay_calc_type")
        .eq("id", clientProfile.tenant_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientProfile?.tenant_id,
  });
}

export function useCreateQuoteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: {
      tenant_id: string;
      client_id: string;
      check_in_date: string;
      check_out_date: string;
      num_pets: number;
      pet_names: string;
      notes: string;
    }) => {
      const { data, error } = await supabase
        .from("quote_requests")
        .insert(request)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cliente-quote-requests"] }),
  });
}

export function useClienteQuoteRequests() {
  const { data: clientProfile } = useClienteProfile();
  return useQuery({
    queryKey: ["cliente-quote-requests", clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile) return [];
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .eq("client_id", clientProfile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientProfile?.id,
  });
}
