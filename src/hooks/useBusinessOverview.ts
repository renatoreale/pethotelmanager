import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { useQuery } from "@tanstack/react-query";
import {
  eachDayOfInterval, startOfYear, subDays, subYears, isWithinInterval,
} from "date-fns";

// Stessa distinzione "soggiorno reale" usata altrove (send-client-reminders,
// useClientOpportunities): esclude preventivi, cancellazioni e rimborsi.
const ACTIVE_BOOKING_STATUSES = [
  "confermata", "appuntamento_fissato", "check_in", "in_corso", "check_out", "chiusa",
];
// Sottoinsieme di soggiorni conclusi/in corso, stessa definizione già usata
// in Statistiche.tsx per durata media soggiorno.
const COMPLETED_BOOKING_STATUSES = ["chiusa", "in_corso", "check_out"];

export type BusinessPeriod = "7d" | "30d" | "90d" | "anno";

export const BUSINESS_PERIODS: { value: BusinessPeriod; label: string }[] = [
  { value: "7d", label: "7 giorni" },
  { value: "30d", label: "30 giorni" },
  { value: "90d", label: "90 giorni" },
  { value: "anno", label: "Anno" },
];

interface OverviewBooking {
  id: string;
  client_id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  total_amount: number | null;
  units_occupied: number | null;
  created_at: string;
}

interface OverviewPayment {
  booking_id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

function getPeriodRanges(period: BusinessPeriod, today: Date): { current: DateRange; previous: DateRange } {
  if (period === "anno") {
    const start = startOfYear(today);
    return {
      current: { start, end: today },
      previous: { start: subYears(start, 1), end: subYears(today, 1) },
    };
  }
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const start = subDays(today, days - 1);
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, days - 1);
  return {
    current: { start, end: today },
    previous: { start: prevStart, end: prevEnd },
  };
}

function inRange(iso: string, range: DateRange): boolean {
  const d = new Date(iso);
  return isWithinInterval(d, { start: range.start, end: range.end });
}

export interface BusinessMetrics {
  revenue: number;
  bookingsCount: number;
  occupancyPct: number;
  avgStayDays: number;
  avgStayValue: number;
  extraRevenue: number;
  newClients: number;
  returningClients: number;
}

function computeMetrics(
  bookings: OverviewBooking[],
  payments: OverviewPayment[],
  range: DateRange,
  earliestBookingByClient: Map<string, Date>,
  capacityUnits: number,
): BusinessMetrics {
  const paymentsInRange = payments.filter((p) => inRange(p.payment_date, range));
  const revenue = paymentsInRange
    .filter((p) => p.payment_type !== "rimborso")
    .reduce((s, p) => s + Number(p.amount), 0)
    - paymentsInRange
      .filter((p) => p.payment_type === "rimborso")
      .reduce((s, p) => s + Number(p.amount), 0);
  const extraRevenue = paymentsInRange
    .filter((p) => p.payment_type === "extra")
    .reduce((s, p) => s + Number(p.amount), 0);

  const bookingsInRange = bookings.filter((b) => inRange(b.created_at, range));
  const bookingsCount = bookingsInRange.length;

  const completedInRange = bookings.filter(
    (b) => COMPLETED_BOOKING_STATUSES.includes(b.status) && inRange(b.check_out_date, range)
  );
  const avgStayDays = completedInRange.length > 0
    ? completedInRange.reduce((s, b) => {
        const nights = Math.max(1, Math.round((new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) / 86400000));
        return s + nights;
      }, 0) / completedInRange.length
    : 0;
  const avgStayValue = completedInRange.length > 0
    ? completedInRange.reduce((s, b) => s + Number(b.total_amount ?? 0), 0) / completedInRange.length
    : 0;

  let occupancyPct = 0;
  if (capacityUnits > 0) {
    const days = eachDayOfInterval({ start: range.start, end: range.end });
    const occupiedUnitDays = days.reduce((sum, day) => {
      const occupiedToday = bookings.reduce((units, b) => {
        if (!ACTIVE_BOOKING_STATUSES.includes(b.status)) return units;
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);
        return day >= checkIn && day < checkOut ? units + (b.units_occupied ?? 1) : units;
      }, 0);
      return sum + occupiedToday;
    }, 0);
    occupancyPct = (occupiedUnitDays / (capacityUnits * days.length)) * 100;
  }

  const clientsInRange = new Set(bookingsInRange.filter((b) => ACTIVE_BOOKING_STATUSES.includes(b.status)).map((b) => b.client_id));
  let newClients = 0;
  let returningClients = 0;
  for (const clientId of clientsInRange) {
    const earliest = earliestBookingByClient.get(clientId);
    if (earliest && earliest >= range.start) newClients++;
    else returningClients++;
  }

  return { revenue, bookingsCount, occupancyPct, avgStayDays, avgStayValue, extraRevenue, newClients, returningClients };
}

export function useBusinessOverview(period: BusinessPeriod) {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const { data: tenantConfig } = useTenantConfig();

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["business-overview-bookings", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, client_id, check_in_date, check_out_date, status, total_amount, units_occupied, created_at")
        .eq("tenant_id", profile.tenant_id)
        .in("status", ACTIVE_BOOKING_STATUSES);
      if (error) throw error;
      return data as OverviewBooking[];
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["business-overview-payments", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("booking_id, amount, payment_type, payment_date")
        .eq("tenant_id", profile.tenant_id);
      if (error) throw error;
      return data as OverviewPayment[];
    },
    enabled: !!profile?.tenant_id,
  });

  const result = useMemo(() => {
    if (!bookings || !payments) return null;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const { current, previous } = getPeriodRanges(period, today);

    const earliestBookingByClient = new Map<string, Date>();
    for (const b of bookings) {
      const created = new Date(b.created_at);
      const existing = earliestBookingByClient.get(b.client_id);
      if (!existing || created < existing) earliestBookingByClient.set(b.client_id, created);
    }

    const capacityUnits = (tenantConfig?.num_singole ?? 0) + (tenantConfig?.num_doppie ?? 0);

    const paymentsByBooking = new Map<string, OverviewPayment[]>();
    for (const p of payments) {
      const list = paymentsByBooking.get(p.booking_id) ?? [];
      list.push(p);
      paymentsByBooking.set(p.booking_id, list);
    }
    const openBalance = bookings.reduce((sum, b) => {
      const bookingPayments = paymentsByBooking.get(b.id) ?? [];
      const paid = bookingPayments
        .filter((p) => p.payment_type !== "rimborso" && p.payment_type !== "gestione_pratica")
        .reduce((s, p) => s + Number(p.amount), 0);
      const refunded = bookingPayments
        .filter((p) => p.payment_type === "rimborso")
        .reduce((s, p) => s + Number(p.amount), 0);
      const remaining = Math.max(0, Number(b.total_amount ?? 0) - (paid - refunded));
      return sum + remaining;
    }, 0);

    return {
      current: computeMetrics(bookings, payments, current, earliestBookingByClient, capacityUnits),
      previous: computeMetrics(bookings, payments, previous, earliestBookingByClient, capacityUnits),
      openBalance,
      hasCapacityConfigured: capacityUnits > 0,
    };
  }, [bookings, payments, period, tenantConfig?.num_singole, tenantConfig?.num_doppie]);

  return { ...result, isLoading: bookingsLoading || paymentsLoading };
}
