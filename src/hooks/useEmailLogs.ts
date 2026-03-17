import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery } from "@tanstack/react-query";

export interface EmailLog {
  id: string;
  tenant_id: string;
  client_id: string | null;
  booking_id: string | null;
  direction: "sent" | "received";
  email_type: string;
  subject: string | null;
  recipient_email: string | null;
  sent_at: string;
  status: string;
  body_html: string | null;
}

export function useClientEmailLogs(clientId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["email-logs", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("email_logs" as any)
        .select("id, email_type, subject, recipient_email, sent_at, status, booking_id, body_html")
        .eq("client_id", clientId)
        .order("sent_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as EmailLog[];
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });
}
