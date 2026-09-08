import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Client } from "@/hooks/useClients";

// Stessa distinzione "soggiorno reale" usata in send-client-reminders: si
// escludono preventivi, cancellazioni e rimborsi dal calcolo di ricorrenza,
// valore e inattività del cliente. Include anche le varianti
// "appuntamento_*_fissato" (prodotte da AppointmentScheduleDialog), prima
// mancanti qui: senza di esse questi clienti sparivano dalle opportunità.
const ACTIVE_BOOKING_STATUSES = [
  "confermata",
  "appuntamento_fissato",
  "appuntamento_in_fissato",
  "appuntamento_out_fissato",
  "appuntamento_in_out_fissato",
  "check_in",
  "in_corso",
  "check_out",
  "chiusa",
];

// Finestra di ricerca per il "ritorno stagionale": quanto ci si allontana
// dalla data di un anno fa per considerare due soggiorni "nello stesso
// periodo".
const SEASONAL_WINDOW_DAYS = 21;

interface OpportunityBooking {
  id: string;
  client_id: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number | null;
}

export interface ClientOpportunitySettings {
  inactiveDays: number;
  highValueThreshold: number;
}

export interface ToContactOpportunity {
  client: Client;
  lastCheckOutDate: string;
  daysSinceLastStay: number;
}

export interface RecurringOpportunity {
  client: Client;
  staysCount: number;
}

export interface SeasonalOpportunity {
  client: Client;
  lastYearCheckIn: string;
  lastYearCheckOut: string;
}

export interface HighValueOpportunity {
  client: Client;
  totalSpent: number;
}

function useClientBookingsSummary() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["client-opportunities-bookings", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, client_id, check_in_date, check_out_date, total_amount")
        .eq("tenant_id", profile.tenant_id)
        .in("status", ACTIVE_BOOKING_STATUSES);
      if (error) throw error;
      return data as OpportunityBooking[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useClientOpportunities(clients: Client[] | undefined, settings: ClientOpportunitySettings) {
  const { data: bookings, isLoading: bookingsLoading } = useClientBookingsSummary();

  const result = useMemo(() => {
    const empty = { toContact: [], recurring: [], seasonal: [], highValue: [] };
    if (!clients || !bookings) return empty;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingsByClient = new Map<string, OpportunityBooking[]>();
    for (const b of bookings) {
      const list = bookingsByClient.get(b.client_id) ?? [];
      list.push(b);
      bookingsByClient.set(b.client_id, list);
    }

    const activeClients = clients.filter((c) => !c.is_blacklisted);

    const toContact: ToContactOpportunity[] = [];
    const recurring: RecurringOpportunity[] = [];
    const seasonal: SeasonalOpportunity[] = [];
    const highValue: HighValueOpportunity[] = [];

    for (const client of activeClients) {
      const clientBookings = bookingsByClient.get(client.id) ?? [];
      if (clientBookings.length === 0) continue;

      const hasUpcomingOrCurrentStay = clientBookings.some(
        (b) => differenceInCalendarDays(parseISO(b.check_out_date), today) >= 0
      );

      // 1. Clienti da ricontattare: nessun soggiorno in corso o futuro, e
      // l'ultimo soggiorno si è concluso da più dei giorni configurati.
      if (!hasUpcomingOrCurrentStay) {
        const lastCheckOut = clientBookings.reduce((latest, b) =>
          b.check_out_date > latest ? b.check_out_date : latest, clientBookings[0].check_out_date);
        const daysSinceLastStay = differenceInCalendarDays(today, parseISO(lastCheckOut));
        if (daysSinceLastStay >= settings.inactiveDays) {
          toContact.push({ client, lastCheckOutDate: lastCheckOut, daysSinceLastStay });
        }
      }

      // 2. Clienti ricorrenti: più di un soggiorno reale.
      if (clientBookings.length >= 2) {
        recurring.push({ client, staysCount: clientBookings.length });
      }

      // 3. Ritorno stagionale: soggiorno nello stesso periodo dell'anno
      // scorso, ma nessun soggiorno già fissato quest'anno.
      if (!hasUpcomingOrCurrentStay) {
        const lastYearMatch = clientBookings.find((b) => {
          const daysFromAnniversary = differenceInCalendarDays(today, parseISO(b.check_in_date)) - 365;
          return Math.abs(daysFromAnniversary) <= SEASONAL_WINDOW_DAYS;
        });
        if (lastYearMatch) {
          seasonal.push({
            client,
            lastYearCheckIn: lastYearMatch.check_in_date,
            lastYearCheckOut: lastYearMatch.check_out_date,
          });
        }
      }

      // 4. Clienti ad alto valore: spesa totale sopra la soglia configurata.
      const totalSpent = clientBookings.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);
      if (totalSpent >= settings.highValueThreshold) {
        highValue.push({ client, totalSpent });
      }
    }

    toContact.sort((a, b) => b.daysSinceLastStay - a.daysSinceLastStay);
    recurring.sort((a, b) => b.staysCount - a.staysCount);
    seasonal.sort((a, b) => a.lastYearCheckIn.localeCompare(b.lastYearCheckIn));
    highValue.sort((a, b) => b.totalSpent - a.totalSpent);

    return { toContact, recurring, seasonal, highValue };
  }, [clients, bookings, settings.inactiveDays, settings.highValueThreshold]);

  return { ...result, isLoading: bookingsLoading };
}
