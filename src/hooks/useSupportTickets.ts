import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useAuth } from "@/hooks/useAuth";

export type TicketCategory = "tecnico" | "fatturazione" | "configurazione" | "altro";
export type TicketPriority = "bassa" | "normale" | "alta" | "urgente";
export type TicketStatus = "aperto" | "in_lavorazione" | "risolto" | "chiuso";

export interface SupportTicket {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  // joined
  tenant_name?: string;
  creator_name?: string;
  message_count?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  is_support_reply: boolean;
  created_at: string;
  author_name?: string;
}

// Fire-and-forget: chiama la edge function di notifica senza bloccare
async function notifyTicket(supabase: any, payload: Record<string, unknown>) {
  try {
    await supabase.functions.invoke("notify-ticket", { body: payload });
  } catch (err) {
    console.warn("notify-ticket non raggiungibile:", err);
  }
}

// ── User hooks ────────────────────────────────────────────────────────────────

export function useMyTickets() {
  const supabase = useSupabase();
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["support-tickets-my", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets" as any)
        .select("*, profiles!created_by(full_name)")
        .eq("tenant_id", profile!.tenant_id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        creator_name: t.profiles?.full_name ?? "—",
      })) as SupportTicket[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useCreateTicket() {
  const supabase = useSupabase();
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; category: TicketCategory; priority: TicketPriority; body: string }) => {
      // Create ticket
      const { data: ticket, error: ticketErr } = await supabase
        .from("support_tickets" as any)
        .insert({
          tenant_id: profile!.tenant_id,
          created_by: user!.id,
          title: payload.title,
          category: payload.category,
          priority: payload.priority,
          status: "aperto",
        })
        .select()
        .single();
      if (ticketErr) throw ticketErr;
      // First message
      const { error: msgErr } = await supabase
        .from("support_ticket_messages" as any)
        .insert({
          ticket_id: (ticket as any).id,
          author_id: user!.id,
          body: payload.body,
          is_support_reply: false,
        });
      if (msgErr) throw msgErr;
      // Notifica
      notifyTicket(supabase, {
        event: "created",
        ticket_id: (ticket as any).id,
        message_body: payload.body,
      });
      return ticket;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-tickets-my"] }),
  });
}

export function useTicketMessages(ticketId: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages" as any)
        .select("*, profiles!author_id(full_name)")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        ...m,
        author_name: m.profiles?.full_name ?? "—",
      })) as TicketMessage[];
    },
    enabled: !!ticketId,
    refetchInterval: 15000,
  });
}

export function useReplyTicket() {
  const supabase = useSupabase();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, body, isSupportReply }: { ticketId: string; body: string; isSupportReply: boolean }) => {
      const { error } = await supabase
        .from("support_ticket_messages" as any)
        .insert({ ticket_id: ticketId, author_id: user!.id, body, is_support_reply: isSupportReply });
      if (error) throw error;
      // Notifica
      notifyTicket(supabase, {
        event: "message",
        ticket_id: ticketId,
        message_body: body,
        is_support_reply: isSupportReply,
      });
    },
    onSuccess: (_, { ticketId }) => {
      qc.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["support-tickets-my"] });
      qc.invalidateQueries({ queryKey: ["support-tickets-all"] });
    },
  });
}

export function useUpdateTicketStatus() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const { error } = await supabase
        .from("support_tickets" as any)
        .update({ status })
        .eq("id", ticketId);
      if (error) throw error;
      // Notifica
      notifyTicket(supabase, {
        event: "status_changed",
        ticket_id: ticketId,
        new_status: status,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-tickets-my"] });
      qc.invalidateQueries({ queryKey: ["support-tickets-all"] });
    },
  });
}

// ── Admin hooks ───────────────────────────────────────────────────────────────

export function useAllTickets(statusFilter?: TicketStatus | "tutti") {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["support-tickets-all", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets" as any)
        .select("*, profiles!created_by(full_name), tenants!tenant_id(name)")
        .order("updated_at", { ascending: false });
      if (statusFilter && statusFilter !== "tutti") {
        q = q.eq("status", statusFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        creator_name: t.profiles?.full_name ?? "—",
        tenant_name: t.tenants?.name ?? "—",
      })) as SupportTicket[];
    },
  });
}
