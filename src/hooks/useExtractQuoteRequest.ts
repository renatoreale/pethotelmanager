import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabaseClient";

export interface ExtractedQuoteRequest {
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  num_pets: number | null;
  pet_names: string | null;
  notes: string;
}

// Chiama l'edge function extract-quote-request (Blocco 27): estrae dati
// strutturati da un testo libero (richiesta cliente incollata da
// WhatsApp/email/telefonata). Non scrive nulla — l'abbinamento al cliente
// e la creazione del preventivo restano sempre passi manuali dello staff
// (vedi ExtractQuoteRequestDialog.tsx).
export function useExtractQuoteRequest() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      const { data, error } = await supabase.functions.invoke("extract-quote-request", {
        body: { tenant_id: profile.tenant_id, text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.extracted as ExtractedQuoteRequest;
    },
  });
}
