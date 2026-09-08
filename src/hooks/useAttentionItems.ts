import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useTasksForDate } from "@/hooks/usePlanningTasks";
import { REQUIRED_DOCUMENT_TYPES, PERSISTENT_DOCUMENT_TYPES } from "@/lib/documentTypes";
import { format, addDays, differenceInMinutes, parseISO } from "date-fns";

// Stesso elenco di stati "reali" usato altrove (useClientOpportunities,
// useBusinessOverview, send-client-reminders): esclude preventivi,
// cancellazioni e rimborsi.
const ACTIVE_STATUSES = [
  "confermata", "appuntamento_fissato", "check_in", "in_corso", "check_out", "chiusa",
];

export type NotificationSeverity = "critico" | "attenzione" | "informazione";

export interface AttentionNotification {
  key: string;
  severity: NotificationSeverity;
  label: string;
  detail: string;
  href: string;
}

function calcRemaining(totalAmount: number, payments: { amount: number; payment_type: string }[]) {
  const paid = payments
    .filter((p) => p.payment_type !== "rimborso" && p.payment_type !== "gestione_pratica")
    .reduce((s, p) => s + Number(p.amount), 0);
  const refunded = payments
    .filter((p) => p.payment_type === "rimborso")
    .reduce((s, p) => s + Number(p.amount), 0);
  return Math.max(0, totalAmount - (paid - refunded));
}

function petNames(booking: any): string {
  return (booking.booking_cats ?? []).map((bc: any) => bc.cats?.name).filter(Boolean).join(", ") || "il pet";
}
function clientName(booking: any): string {
  return booking.client ? `${booking.client.first_name} ${booking.client.last_name}` : "—";
}

// Centro notifiche (Blocco 25): stessa logica di "cosa richiede attenzione
// oggi" già usata nella dashboard "Oggi in pensione", ma calcolata in modo
// indipendente (query proprie, sempre su "oggi") così da essere
// raggiungibile da qualunque pagina tramite la campanella in header, senza
// toccare lo stato/le query esistenti di Index.tsx.
export function useAttentionItems() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const in3DaysStr = format(addDays(new Date(), 3), "yyyy-MM-dd");

  const { data: upcomingCheckins, isLoading: loadingUpcoming } = useQuery({
    queryKey: ["notif-upcoming-checkins", profile?.tenant_id, todayStr],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_number, client_id, check_in_date, client:clients(first_name, last_name), booking_cats(cats(name))")
        .eq("tenant_id", profile.tenant_id)
        .in("status", ACTIVE_STATUSES)
        .gte("check_in_date", todayStr)
        .lte("check_in_date", in3DaysStr);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60_000,
  });

  const bookingIds = useMemo(() => (upcomingCheckins ?? []).map((b: any) => b.id), [upcomingCheckins]);
  const { data: docs } = useQuery({
    queryKey: ["notif-documents", bookingIds],
    queryFn: async () => {
      if (bookingIds.length === 0) return [];
      const clientIds = (upcomingCheckins ?? []).map((b: any) => b.client_id);
      const { data, error } = await supabase
        .from("documents")
        .select("document_type, booking_id, client_id")
        .or(`booking_id.in.(${bookingIds.join(",")}),client_id.in.(${clientIds.join(",")})`);
      if (error) throw error;
      return data ?? [];
    },
    enabled: bookingIds.length > 0,
    staleTime: 60_000,
  });

  const { data: overdueBookings } = useQuery({
    queryKey: ["notif-overdue-payments", profile?.tenant_id, todayStr],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_number, total_amount, client:clients(first_name, last_name), payments(amount, payment_type)")
        .eq("tenant_id", profile.tenant_id)
        .in("status", ACTIVE_STATUSES)
        .lt("check_out_date", todayStr);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60_000,
  });

  const { data: todayCheckins } = useQuery({
    queryKey: ["notif-today-checkins", profile?.tenant_id, todayStr],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_number, client:clients(first_name, last_name), booking_cats(cats(name)), appointments(appointment_type, scheduled_at)")
        .eq("tenant_id", profile.tenant_id)
        .in("status", ACTIVE_STATUSES)
        .eq("check_in_date", todayStr);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60_000,
  });

  const { data: todayTasks, isLoading: loadingTasks } = useTasksForDate(todayStr);

  const items: AttentionNotification[] = useMemo(() => {
    const list: AttentionNotification[] = [];

    // Documento mancante per un check-in nei prossimi 3 giorni.
    for (const b of (upcomingCheckins ?? []) as any[]) {
      const missing = REQUIRED_DOCUMENT_TYPES.filter((type) => {
        if (PERSISTENT_DOCUMENT_TYPES.includes(type)) {
          return !(docs ?? []).some((d: any) => d.client_id === b.client_id && d.document_type === type);
        }
        return !(docs ?? []).some((d: any) => d.booking_id === b.id && d.document_type === type);
      });
      if (missing.length > 0) {
        list.push({
          key: `doc-${b.id}`, severity: "critico",
          label: `Documento mancante per ${petNames(b)}`,
          detail: `${clientName(b)} · check-in ${format(parseISO(b.check_in_date), "dd/MM")}`,
          href: `/prenotazioni?q=${encodeURIComponent(b.booking_number)}`,
        });
      }
    }

    // Pagamenti ancora aperti su soggiorni già conclusi.
    for (const b of (overdueBookings ?? []) as any[]) {
      const remaining = calcRemaining(Number(b.total_amount ?? 0), b.payments ?? []);
      if (remaining > 0) {
        list.push({
          key: `pay-${b.id}`, severity: "critico",
          label: `Pagamento di € ${remaining.toFixed(0)} ancora aperto`,
          detail: clientName(b),
          href: "/pagamenti",
        });
      }
    }

    // Farmaci imminenti (entro 30 minuti, non ancora somministrati).
    for (const tk of (todayTasks ?? []) as any[]) {
      if (tk.category !== "farmaco" || tk.completed || !tk.scheduled_time) continue;
      const [hh, mm] = tk.scheduled_time.split(":").map(Number);
      const target = new Date();
      target.setHours(hh, mm, 0, 0);
      const minsUntil = differenceInMinutes(target, new Date());
      if (minsUntil >= 0 && minsUntil <= 30) {
        list.push({
          key: `med-${tk.id}`, severity: "attenzione",
          label: `Farmaco di ${tk.cat?.name ?? "un pet"} tra ${minsUntil} minut${minsUntil === 1 ? "o" : "i"}`,
          detail: tk.title,
          href: "/farmaci",
        });
      }
    }

    // Check-in di oggi entro 60 minuti.
    for (const b of (todayCheckins ?? []) as any[]) {
      const appt = (b.appointments ?? []).find((a: any) => a.appointment_type === "check_in");
      if (!appt) continue;
      const minsUntil = differenceInMinutes(new Date(appt.scheduled_at), new Date());
      if (minsUntil >= 0 && minsUntil <= 60) {
        list.push({
          key: `checkin-${b.id}`, severity: "attenzione",
          label: `Check-in di ${clientName(b)} alle ${format(new Date(appt.scheduled_at), "HH:mm")}`,
          detail: petNames(b),
          href: "/check-in",
        });
      }
    }

    const rank: Record<NotificationSeverity, number> = { critico: 0, attenzione: 1, informazione: 2 };
    return list.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [upcomingCheckins, docs, overdueBookings, todayTasks, todayCheckins]);

  return { items, isLoading: loadingUpcoming || loadingTasks };
}
