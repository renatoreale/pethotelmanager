import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabaseClient";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantTaskProposal {
  type: "create_planning_task";
  params: {
    title: string;
    task_date: string;
    description?: string;
    scheduled_time?: string;
    category?: string;
    priority?: string;
  };
}

interface AssistantResponse {
  reply: string;
  proposal: AssistantTaskProposal | null;
}

// Chiama l'edge function ai-assistant (Blocco 26): la cronologia resta lato
// client (nessuna tabella di persistenza per ora, per tenere il blocco
// piccolo), il server la usa solo per il turno corrente e non scrive mai sul
// database — al massimo restituisce una "proposta" che va confermata a mano.
export function useSendAssistantMessage() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (messages: AssistantMessage[]) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { tenant_id: profile.tenant_id, messages },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as AssistantResponse;
    },
  });
}
