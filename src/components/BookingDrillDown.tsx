import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Calendar, CreditCard, Receipt, Tag, ChevronDown } from "lucide-react";
import { useBookingPayments } from "@/hooks/usePayments";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  caparra: "Caparra",
  saldo: "Saldo",
  extra: "Extra",
  rimborso: "Rimborso",
};

const TYPE_COLORS: Record<string, string> = {
  caparra: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  saldo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  extra: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  rimborso: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

interface BookingDrillDownProps {
  booking: any;
}

export function BookingDrillDown({ booking }: BookingDrillDownProps) {
  const [open, setOpen] = useState(false);
  const { data: payments, isLoading: paymentsLoading } = useBookingPayments(open ? booking.id : undefined);
  const { data: tenantConfig } = useTenantConfig();

  const stayCalcType = tenantConfig?.stay_calc_type ?? "notti";
  const countCheckinDay = tenantConfig?.count_checkin_day ?? true;
  const countCheckoutDay = tenantConfig?.count_checkout_day ?? true;

  const duration = useMemo(() => {
    const diff = differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date));
    if (diff < 0) return 0;
    if (stayCalcType === "notti") return diff;
    let days = diff + 1;
    if (!countCheckinDay) days -= 1;
    if (!countCheckoutDay) days -= 1;
    return Math.max(0, days);
  }, [booking, stayCalcType, countCheckinDay, countCheckoutDay]);

  const stayLabel = stayCalcType === "notti" ? "notti" : "giorni";

  const priceBreakdown = booking.price_breakdown;
  const totalAmount = Number(booking.total_amount ?? 0);
  const depositAmount = Number(booking.deposit_amount ?? 0);

  const { totalPaid, totalRefunded, netPaid, remaining } = useMemo(() => {
    const paid = (payments ?? []).filter(p => p.payment_type !== "rimborso").reduce((s, p) => s + Number(p.amount), 0);
    const refunded = (payments ?? []).filter(p => p.payment_type === "rimborso").reduce((s, p) => s + Number(p.amount), 0);
    const net = paid - refunded;
    return { totalPaid: paid, totalRefunded: refunded, netPaid: net, remaining: totalAmount - net };
  }, [payments, totalAmount]);

  const numCats = (booking.booking_cats ?? []).length;
  const catNames = (booking.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ");

  // Extract extras from price_breakdown if available
  const extras = useMemo(() => {
    if (!priceBreakdown) return [];
    const items: { label: string; amount: number }[] = [];
    if (priceBreakdown.extras && Array.isArray(priceBreakdown.extras)) {
      priceBreakdown.extras.forEach((e: any) => {
        items.push({ label: e.name || e.label || "Extra", amount: Number(e.amount || e.total || 0) });
      });
    }
    if (priceBreakdown.extraServices && Array.isArray(priceBreakdown.extraServices)) {
      priceBreakdown.extraServices.forEach((e: any) => {
        if (Number(e.total || e.amount || 0) > 0) {
          items.push({ label: e.name || e.label || "Extra", amount: Number(e.total || e.amount || 0) });
        }
      });
    }
    if (priceBreakdown.extra_km_cost && Number(priceBreakdown.extra_km_cost) > 0) {
      items.push({ label: `Trasporto (${priceBreakdown.extra_km ?? 0} km extra)`, amount: Number(priceBreakdown.extra_km_cost) });
    }
    return items;
  }, [priceBreakdown]);

  // Extra days from date changes (check-in anticipato / check-out posticipato)
  const extraDaysInfo = priceBreakdown?.extra_days_info ?? null;

  const discount = priceBreakdown?.discount ? Number(priceBreakdown.discount) : 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border/50 cursor-pointer">
        <span>{open ? "Nascondi dettagli" : "Mostra dettagli"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-4 pt-2">

          {/* Stay period */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Soggiorno
            </h4>
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Periodo</span>
                <span className="font-medium">
                  {format(parseISO(booking.check_in_date), "dd MMM yyyy", { locale: it })} → {format(parseISO(booking.check_out_date), "dd MMM yyyy", { locale: it })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Durata</span>
                <span className="font-medium">{duration} {stayLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo gabbia</span>
                <span className="font-medium capitalize">{booking.cage_pool_type} × {booking.units_occupied}</span>
              </div>
              {catNames && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gatti ({numCats})</span>
                  <span className="font-medium">{catNames}</span>
                </div>
              )}
              {priceBreakdown?.tariff_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tariffa</span>
                  <span className="font-medium">{priceBreakdown.tariff_name}</span>
                </div>
              )}
              {priceBreakdown?.base_total != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo soggiorno</span>
                  <span className="font-medium">€ {Number(priceBreakdown.base_total).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Extras */}
          {extras.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Extra
              </h4>
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                {extras.map((e, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{e.label}</span>
                    <span className="font-medium">€ {e.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discount */}
          {discount > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sconto</h4>
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sconto applicato</span>
                  <span className="font-medium text-green-600">- € {discount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Totals summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Riepilogo
            </h4>
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Totale prenotazione</span>
                <span>€ {totalAmount.toFixed(2)}</span>
              </div>
              {depositAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Caparra prevista</span>
                  <span className="font-medium">€ {depositAmount.toFixed(2)}</span>
                </div>
              )}
              {open && !paymentsLoading && (
                <>
                  <Separator className="my-1.5" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Incassato</span>
                    <span className="font-medium text-green-600">€ {netPaid.toFixed(2)}</span>
                  </div>
                  {totalRefunded > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rimborsato</span>
                      <span className="font-medium text-red-600">- € {totalRefunded.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <span>Residuo</span>
                    <span className={remaining > 0 ? "text-amber-600" : "text-green-600"}>
                      € {remaining.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Transazioni
            </h4>
            {paymentsLoading ? (
              <div className="py-3 text-center text-xs text-muted-foreground">Caricamento...</div>
            ) : !payments?.length ? (
              <div className="py-3 text-center text-xs text-muted-foreground">Nessuna transazione registrata</div>
            ) : (
              <div className="rounded-md border max-h-[200px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8 px-2">Data</TableHead>
                      <TableHead className="text-xs h-8 px-2">Tipo</TableHead>
                      <TableHead className="text-xs h-8 px-2">Modalità</TableHead>
                      <TableHead className="text-xs h-8 px-2 text-right">Importo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs py-1.5 px-2">
                          {format(parseISO(p.payment_date), "dd MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell className="py-1.5 px-2">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[p.payment_type] ?? "bg-muted"}`}>
                            {TYPE_LABELS[p.payment_type] ?? p.payment_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-1.5 px-2">
                          {(p as any).payment_method?.name ?? p.method ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs py-1.5 px-2">
                          {p.payment_type === "rimborso" ? "-" : ""}€ {Number(p.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Notes from payments */}
          {payments && payments.length > 0 && payments.some(p => p.notes) && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {payments.filter(p => p.notes).map(p => (
                <div key={p.id}>
                  <span className="font-medium">{TYPE_LABELS[p.payment_type]}:</span> {p.notes}
                </div>
              ))}
            </div>
          )}

          {/* Booking notes */}
          {booking.notes && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Note:</span> {booking.notes}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
