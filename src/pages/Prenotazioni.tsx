import { useState, useMemo, Fragment } from "react";
import { HelpButton } from "@/components/HelpButton";
import { prenotazioniHelpSections } from "@/components/help/prenotazioniHelp";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, CalendarDays, MoreHorizontal, Pencil, CalendarClock, CreditCard, ChevronDown, Trash2, FileDown } from "lucide-react";
import { BookingDrillDown } from "@/components/BookingDrillDown";
import { AutocompleteSearch } from "@/components/AutocompleteSearch";
import { AppointmentScheduleDialog } from "@/components/preventivi/AppointmentScheduleDialog";
import { BookingPaymentsDialog } from "@/components/payments/BookingPaymentsDialog";
import { PreventivoDialog } from "@/components/preventivi/PreventivoDialog";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { useBookings, useTransitionBooking, useDeleteBooking, getTransitions } from "@/hooks/useBookings";
import { useUpdatePreventivo } from "@/hooks/usePreventivi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentSplits } from "@/hooks/usePaymentSplits";
import { generatePreventivoPDF } from "@/lib/generatePreventivoPDF";
import { generateModuloAffidoPDF } from "@/lib/generateModuloAffidoPDF";

const STATUS_OPTIONS = [
  { value: "tutti", label: "Tutti gli stati" },
  { value: "confermata", label: "Confermata" },
  { value: "appuntamento_in_fissato", label: "Appt. IN fissato" },
  { value: "appuntamento_out_fissato", label: "Appt. OUT fissato" },
  { value: "appuntamento_in_out_fissato", label: "Appt. IN-OUT fissati" },
  { value: "check_in", label: "Check-in" },
  { value: "in_corso", label: "In corso" },
  { value: "check_out", label: "Check-out" },
  { value: "chiusa", label: "Chiusa" },
  { value: "cancellata", label: "Cancellata" },
  { value: "rimborsata", label: "Rimborsata" },
  { value: "scaduto", label: "Scaduto" },
];

const STATUS_COLORS: Record<string, string> = {
  confermata: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  appuntamento_in_fissato: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  appuntamento_out_fissato: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  appuntamento_in_out_fissato: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  check_in: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  in_corso: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  check_out: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  chiusa: "bg-muted text-muted-foreground",
  cancellata: "bg-destructive/10 text-destructive",
  rimborsata: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  scaduto: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  confermata: "Confermata",
  appuntamento_in_fissato: "Appt. IN fissato",
  appuntamento_out_fissato: "Appt. OUT fissato",
  appuntamento_in_out_fissato: "Appt. IN-OUT fissati",
  check_in: "Check-in",
  in_corso: "In corso",
  check_out: "Check-out",
  chiusa: "Chiusa",
  cancellata: "Cancellata",
  rimborsata: "Rimborsata",
  scaduto: "Scaduto",
};

export default function Prenotazioni() {
  const [statusFilter, setStatusFilter] = useState("tutti");
  const [search, setSearch] = useState("");
  const [transitioning, setTransitioning] = useState<{ id: string; bookingNumber: string; newStatus: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; bookingNumber: string } | null>(null);
  const [schedulingBooking, setSchedulingBooking] = useState<any>(null);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [paymentsBooking, setPaymentsBooking] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: bookings, isLoading } = useBookings(statusFilter);
  const transitionBooking = useTransitionBooking();
  const deleteBooking = useDeleteBooking();
  const updatePreventivo = useUpdatePreventivo();
  const { data: tenantConfig } = useTenantConfig();
  const { data: paymentSplits } = usePaymentSplits();
  const { user, profile } = useAuth();

  const stayCalcType = (tenantConfig as any)?.stay_calc_type ?? "notti";
  const countCheckinDay = (tenantConfig as any)?.count_checkin_day ?? true;
  const countCheckoutDay = (tenantConfig as any)?.count_checkout_day ?? true;

  const calcStayDuration = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const diff = differenceInDays(parseISO(checkOut), parseISO(checkIn));
    if (diff < 0) return 0;
    if (stayCalcType === "notti") return diff;
    let days = diff + 1;
    if (!countCheckinDay) days -= 1;
    if (!countCheckoutDay) days -= 1;
    return Math.max(0, days);
  };

  const filtered = useMemo(() => {
    if (!bookings) return [];
    if (!search.trim()) return bookings;
    const q = search.toLowerCase();
    return bookings.filter((b) => {
      const clientName = `${b.client?.first_name ?? ""} ${b.client?.last_name ?? ""}`.toLowerCase();
      return clientName.includes(q) || b.booking_number.toLowerCase().includes(q);
    });
  }, [bookings, search]);

  const handleTransition = async () => {
    if (!transitioning) return;
    try {
      let cancellationInfo: string | null = null;
      // If cancelling, automatically calculate refund and create payment records
      if (transitioning.newStatus === "cancellata" && profile?.tenant_id) {
        const booking = bookings?.find(b => b.id === transitioning.id);
        if (booking) {
          // 1. Fetch existing payments for this booking
          const { data: existingPayments } = await supabase
            .from("payments")
            .select("amount, payment_type")
            .eq("booking_id", booking.id);

          const totalPaid = (existingPayments || [])
            .reduce((sum, p) => {
              const amt = Number(p.amount);
              return p.payment_type === "rimborso" ? sum - amt : sum + amt;
            }, 0);

          // 2. Fetch tenant cancellation policy
          const { data: policy } = await supabase
            .from("cancellation_policies" as any)
            .select("*")
            .eq("tenant_id", profile.tenant_id)
            .maybeSingle();

          if (totalPaid <= 0) {
            console.log("[Cancellazione] Nessun pagamento registrato, niente rimborso da calcolare");
            toast.info("Nessun pagamento registrato per questa prenotazione, niente rimborso da calcolare.");
          } else if (!policy) {
            console.log("[Cancellazione] Nessuna policy di cancellazione trovata per tenant:", profile.tenant_id);
            toast.warning("Nessuna politica di cancellazione configurata per questa pensione. Nessun rimborso automatico generato.");
          } else {
            const policyObj = policy as any;
            const adminFee = Number(policyObj.admin_fee) || 0;

            // 3. Fetch cancellation rules
            const { data: rules } = await supabase
              .from("cancellation_policy_rules" as any)
              .select("*")
              .eq("policy_id", policyObj.id)
              .order("days_before_checkin", { ascending: false });

            // 4. Calculate days before check-in
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkInDate = parseISO(booking.check_in_date);
            const daysBefore = differenceInDays(checkInDate, today);

            console.log("[Cancellazione] totalPaid:", totalPaid, "daysBefore:", daysBefore, "rules:", rules);

            // 5. Find applicable refund percentage (first rule where daysBefore >= days_before_checkin)
            let refundPercentage = 0;
            if (rules && rules.length > 0) {
              const sortedRules = (rules as any[]).sort((a, b) => b.days_before_checkin - a.days_before_checkin);
              for (const rule of sortedRules) {
                if (daysBefore >= rule.days_before_checkin) {
                  refundPercentage = Number(rule.refund_percentage);
                  break;
                }
              }
            }

            console.log("[Cancellazione] refundPercentage:", refundPercentage, "adminFee:", adminFee);

            // 6. Calculate amounts
            const grossRefund = totalPaid * (refundPercentage / 100);
            // Admin fee is always applied when there are payments, even with 0% refund
            const actualAdminFee = totalPaid > 0 ? Math.min(adminFee, totalPaid) : 0;
            const netRefund = Math.max(0, grossRefund - actualAdminFee);
            const paymentDate = new Date().toISOString();

            // 7. Create payment records
            const paymentRecords: any[] = [];

            if (netRefund > 0) {
              paymentRecords.push({
                booking_id: booking.id,
                tenant_id: profile.tenant_id,
                amount: netRefund,
                payment_type: "rimborso",
                payment_date: paymentDate,
                notes: `Rimborso cancellazione (${refundPercentage}% di €${totalPaid.toFixed(2)}, al netto spese gestione €${actualAdminFee.toFixed(2)})`,
                created_by: user?.id ?? null,
              });
            }

            if (actualAdminFee > 0) {
              paymentRecords.push({
                booking_id: booking.id,
                tenant_id: profile.tenant_id,
                amount: actualAdminFee,
                payment_type: "gestione_pratica",
                payment_date: paymentDate,
                notes: `Quota gestione pratica cancellazione`,
                created_by: user?.id ?? null,
              });
            }

            if (paymentRecords.length > 0) {
              console.log("[Cancellazione] Inserimento pagamenti:", paymentRecords);
              const { error: payErr } = await supabase
                .from("payments")
                .insert(paymentRecords);
              if (payErr) throw payErr;
            }

            // Store refund info to show AFTER success toast
            cancellationInfo = refundPercentage > 0
              ? `Rimborso: €${netRefund.toFixed(2)} (${refundPercentage}%)${actualAdminFee > 0 ? ` | Gestione pratica: €${actualAdminFee.toFixed(2)}` : ""}`
              : `Nessun rimborso previsto. Totale pagato: €${totalPaid.toFixed(2)}${actualAdminFee > 0 ? ` | Gestione pratica trattenuta: €${actualAdminFee.toFixed(2)}` : ""}`;
          }
        }
      }
      await transitionBooking.mutateAsync({ id: transitioning.id, newStatus: transitioning.newStatus });
      // Set total_amount to 0 on cancellation so residual becomes 0
      if (transitioning.newStatus === "cancellata") {
        await supabase.from("bookings").update({ total_amount: 0 }).eq("id", transitioning.id);
      }
      toast.success(`Prenotazione ${transitioning.bookingNumber}: ${transitioning.label}`);
      if (cancellationInfo) {
        setTimeout(() => toast.info(cancellationInfo!, { duration: 10000 }), 500);
      }
    } catch (err: any) {
      toast.error(err.message || "Errore nella transizione");
    }
    setTransitioning(null);
  };

  const handleDownloadPDF = async (b: any) => {
    if (!tenantConfig) return;
    try {
      await generatePreventivoPDF(b, tenantConfig as any, paymentSplits ?? [], stayCalcType);
      toast.success("PDF generato");
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione del PDF");
    }
  };

  const handleDownloadModuloAffido = async (b: any) => {
    if (!tenantConfig) return;
    try {
      await generateModuloAffidoPDF(b, tenantConfig as any);
      toast.success("Modulo di Affido generato");
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione del PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prenotazioni</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestisci il workflow delle prenotazioni confermate</p>
        </div>
        <HelpButton
          pageTitle="Guida — Prenotazioni"
          pageDescription="Come gestire il workflow completo delle prenotazioni: appuntamenti, pagamenti, check-in e check-out."
          sections={prenotazioniHelpSections}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <AutocompleteSearch
                value={search}
                onChange={setSearch}
                placeholder="Cerca per cliente o numero..."
                className="flex-1 min-w-[200px] max-w-sm"
              />
              <Badge variant="outline">{filtered.length} prenotazion{filtered.length === 1 ? "e" : "i"}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((o) => (
                <Button
                  key={o.value}
                  size="sm"
                  variant={statusFilter === o.value ? "default" : "outline"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter(statusFilter === o.value && o.value !== "tutti" ? "tutti" : o.value)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !filtered.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <CalendarDays className="mx-auto h-12 w-12 mb-4 opacity-30" />
              Nessuna prenotazione trovata
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Prenotazione</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pets</TableHead>
                    <TableHead>Casetta</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>{stayCalcType === "notti" ? "Notti" : "Giorni"}</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[80px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => {
                    const duration = calcStayDuration(b.check_in_date, b.check_out_date);
                    const catNames = b.booking_cats?.map(bc => bc.cat?.name).filter(Boolean).join(", ") || "—";
                    const transitions = getTransitions(b.status);

                    return (
                      <Fragment key={b.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={(e) => {
                          // Don't toggle if clicking buttons/menus
                          if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) return;
                          setExpandedRows(prev => {
                            const next = new Set<string>();
                            if (!prev.has(b.id)) next.add(b.id);
                            return next;
                          });
                        }}
                      >
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1">
                            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expandedRows.has(b.id) ? "rotate-180" : ""}`} />
                            {b.booking_number}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {b.client ? `${b.client.first_name} ${b.client.last_name}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{catNames}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {b.cage_pool_type === "singola" ? "Singola" : "Doppia"} ×{b.units_occupied}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{format(parseISO(b.check_in_date), "dd MMM yyyy", { locale: it })}</div>
                          {(() => {
                            const apt = b.appointments?.find(a => a.appointment_type === "check_in");
                            if (!apt) return null;
                            const time = apt.scheduled_at.includes("T") ? apt.scheduled_at.split("T")[1]?.substring(0, 5) : "";
                            return time ? <div className="text-xs text-muted-foreground">🕐 {time}</div> : null;
                          })()}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{format(parseISO(b.check_out_date), "dd MMM yyyy", { locale: it })}</div>
                          {(() => {
                            const apt = b.appointments?.find(a => a.appointment_type === "check_out");
                            if (!apt) return null;
                            const time = apt.scheduled_at.includes("T") ? apt.scheduled_at.split("T")[1]?.substring(0, 5) : "";
                            return time ? <div className="text-xs text-muted-foreground">🕐 {time}</div> : null;
                          })()}
                        </TableCell>
                        <TableCell>{duration}</TableCell>
                        <TableCell className="font-medium">€ {Number(b.total_amount ?? 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? "bg-muted text-muted-foreground"}`}>
                            {STATUS_LABELS[b.status] ?? b.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!["check_in", "in_corso", "check_out", "chiusa", "cancellata", "rimborsata"].includes(b.status) ? (
                              <Button variant="ghost" size="icon" onClick={() => setEditingBooking(b)} title="Modifica prenotazione">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="h-8 w-8" />
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setPaymentsBooking(b)} title="Pagamenti">
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            {["appuntamento_in_fissato", "appuntamento_out_fissato", "appuntamento_in_out_fissato"].includes(b.status) ? (
                              <Button variant="ghost" size="icon" onClick={() => setSchedulingBooking(b)} title="Modifica appuntamenti">
                                <CalendarClock className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="h-8 w-8" />
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {transitions.map((t) => (
                                  <DropdownMenuItem
                                    key={t.next}
                                    onClick={() => {
                                      if (t.next === "appuntamento_fissato" || t.next === "appuntamento_in_fissato" || t.next === "appuntamento_out_fissato" || t.next === "appuntamento_in_out_fissato") {
                                        setSchedulingBooking(b);
                                      } else {
                                        setTransitioning({
                                          id: b.id,
                                          bookingNumber: b.booking_number,
                                          newStatus: t.next,
                                          label: t.label,
                                        });
                                      }
                                    }}
                                  >
                                    {t.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem onClick={() => handleDownloadPDF(b)}>
                                  <FileDown className="h-4 w-4 mr-2" />
                                  Scarica Preventivo PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadModuloAffido(b)}>
                                  <FileDown className="h-4 w-4 mr-2" />
                                  Scarica Modulo Affido
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleting({ id: b.id, bookingNumber: b.booking_number })}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(b.id) && (
                        <TableRow>
                          <TableCell colSpan={10} className="p-0 bg-muted/20">
                            <BookingDrillDown booking={b} defaultOpen />
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!transitioning} onOpenChange={() => setTransitioning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{transitioning?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {transitioning && `Vuoi procedere con "${transitioning.label}" per la prenotazione ${transitioning.bookingNumber}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransition}
              className={transitioning?.newStatus === "cancellata" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la prenotazione?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `Vuoi eliminare definitivamente la prenotazione ${deleting.bookingNumber}? Questa azione non può essere annullata.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await deleteBooking.mutateAsync(deleting.id);
                  toast.success(`Prenotazione ${deleting.bookingNumber} eliminata`);
                } catch (err: any) {
                  toast.error(err.message || "Errore nell'eliminazione");
                }
                setDeleting(null);
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppointmentScheduleDialog
        open={!!schedulingBooking}
        onOpenChange={(open) => { if (!open) setSchedulingBooking(null); }}
        booking={schedulingBooking}
      />

      <PreventivoDialog
        open={!!editingBooking}
        onOpenChange={(open) => { if (!open) setEditingBooking(null); }}
        editing={editingBooking}
        onCreate={{ mutateAsync: async () => {} }}
        onUpdate={updatePreventivo}
        stayCalcType={stayCalcType}
        countCheckinDay={countCheckinDay}
        countCheckoutDay={countCheckoutDay}
      />

      <BookingPaymentsDialog
        open={!!paymentsBooking}
        onOpenChange={(v) => { if (!v) setPaymentsBooking(null); }}
        booking={paymentsBooking}
      />
    </div>
  );
}
