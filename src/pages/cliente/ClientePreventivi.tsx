import { useClienteBookings, useClienteTenant } from "@/hooks/useClienteAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { FileText, CreditCard, Building2, Copy, Download, Loader2, CheckCircle2, Eye, Printer, Mail, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateModuloAffidoPDF } from "@/lib/generateModuloAffidoPDF";
import { generatePreventivoPDF } from "@/lib/generatePreventivoPDF";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClienteBookingDetailDialog } from "@/components/cliente/ClienteBookingDetailDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STATUS_LABELS: Record<string, string> = {
  preventivo: "In attesa di conferma",
  confermata: "Confermata",
  appuntamento_fissato: "Appuntamento fissato",
  appuntamento_in_fissato: "App. IN fissato",
  appuntamento_out_fissato: "App. OUT fissato",
  appuntamento_in_out_fissato: "App. IN-OUT fissati",
  check_in: "Check-in",
  in_corso: "In corso",
  check_out: "Check-out",
  chiusa: "Chiusa",
  cancellata: "Cancellata",
  rimborsata: "Rimborsata",
  scaduto: "Scaduto",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  preventivo: "secondary",
  confermata: "default",
  cancellata: "destructive",
  rimborsata: "destructive",
  scaduto: "outline",
  chiusa: "outline",
};

export default function ClientePreventivi() {
  const { data: bookings, isLoading } = useClienteBookings();
  const { data: tenant } = useClienteTenant();
  const [paymentDialog, setPaymentDialog] = useState<any>(null);
  const [detailBooking, setDetailBooking] = useState<any>(null);
  const [payingStripe, setPayingStripe] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [generatingPreventivoPdf, setGeneratingPreventivoPdf] = useState<string | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const verifyAttempted = useRef(false);

  // Check if tenant has Stripe configured
  const { data: tenantHasStripe } = useQuery<boolean>({
    queryKey: ["tenant-has-stripe", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return false;
      const { data, error } = await supabase
        .from("tenant_stripe_keys" as any)
        .select("id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!tenant?.id,
  });

  // Auto-verify Stripe payment on return
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const bookingId = searchParams.get("booking");
    if (paymentStatus === "success" && bookingId && !verifyAttempted.current) {
      verifyAttempted.current = true;
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke("verify-stripe-payment", {
            body: { booking_id: bookingId },
          });
          if (error) throw error;
          if (data?.confirmed) {
            toast.success("Pagamento confermato! Il preventivo è stato accettato.");
            setShowPaymentSuccess(true);
            queryClient.invalidateQueries({ queryKey: ["cliente-bookings"] });
          } else {
            toast.info(data?.reason || "Pagamento in fase di verifica");
          }
        } catch (err: any) {
          toast.error("Errore nella verifica del pagamento");
          console.error(err);
        }
        // Clean URL params
        setSearchParams({}, { replace: true });
      })();
    }
  }, [searchParams, setSearchParams, queryClient]);

  const handleConfirm = (booking: any) => {
    setPaymentDialog(booking);
  };

  const copyIban = () => {
    if (tenant?.iban) {
      navigator.clipboard.writeText(tenant.iban);
      toast.success("IBAN copiato negli appunti");
    }
  };

  const handleStripePayment = async (booking: any) => {
    setPayingStripe(true);
    try {
      const amount = booking.deposit_amount > 0 ? Number(booking.deposit_amount) : Number(booking.total_amount || 0);
      const { data, error } = await supabase.functions.invoke("create-client-payment", {
        body: {
          booking_id: booking.id,
          amount,
          description: `Caparra pratica #${booking.booking_number}`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Errore nel pagamento");
    } finally {
      setPayingStripe(false);
    }
  };

  const handleDownloadAffido = async (booking: any) => {
    setGeneratingPdf(booking.id);
    try {
      // Fetch full booking with appointments
      const { data: fullBooking } = await supabase
        .from("bookings")
        .select("*, booking_cats(cat_id, cats(id, name)), appointments(*)")
        .eq("id", booking.id)
        .single();

      if (!fullBooking || !tenant) {
        toast.error("Dati non disponibili");
        return;
      }

      await generateModuloAffidoPDF(fullBooking as any, tenant as any);
      toast.success("Modulo di affido scaricato");
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione del PDF");
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDownloadPreventivo = async (booking: any) => {
    setGeneratingPreventivoPdf(booking.id);
    try {
      if (!tenant) {
        toast.error("Dati pensione non disponibili");
        return;
      }

      // Fetch full booking data with client and cats
      const { data: fullBooking } = await supabase
        .from("bookings")
        .select("*, client:clients(id, first_name, last_name, email, phone), booking_cats(cat_id, cat:cats(id, name))")
        .eq("id", booking.id)
        .single();

      if (!fullBooking) {
        toast.error("Dati preventivo non disponibili");
        return;
      }

      // Fetch payment splits for tenant
      const { data: splits } = await supabase
        .from("payment_split_configs")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("sort_order");

      await generatePreventivoPDF(
        fullBooking as any,
        tenant as any,
        (splits ?? []) as any,
        tenant.stay_calc_type || "notti",
      );
      toast.success("Preventivo scaricato");
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione del PDF");
    } finally {
      setGeneratingPreventivoPdf(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif font-bold">I Miei Preventivi</h1>

      {(!bookings || bookings.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nessun preventivo</p>
            <p className="text-xs text-muted-foreground mt-1">
              Le tue pratiche appariranno qui quando la pensione creerà un preventivo per te
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {bookings?.map((b: any) => {
          const totalPaid = b.payments
            ?.filter((p: any) => p.payment_type !== "rimborso")
            .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
          const catNames = b.booking_cats?.map((bc: any) => bc.cats?.name).filter(Boolean).join(", ");
          const canDownloadAffido = ["confermata", "appuntamento_fissato", "appuntamento_in_fissato", "appuntamento_out_fissato", "appuntamento_in_out_fissato", "check_in", "in_corso"].includes(b.status);

          return (
            <Card key={b.id}>
              <CardContent className="py-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Pratica #{b.booking_number}</p>
                      <Badge variant={STATUS_VARIANT[b.status] || "default"}>
                        {STATUS_LABELS[b.status] || b.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(b.check_in_date), "dd MMM yyyy", { locale: it })} → {format(new Date(b.check_out_date), "dd MMM yyyy", { locale: it })}
                    </p>
                    {catNames && (
                      <p className="text-xs text-muted-foreground">🐾 {catNames}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold">€ {Number(b.total_amount || 0).toFixed(2)}</p>
                      {totalPaid > 0 && (
                        <p className="text-xs text-green-600">Pagato: € {totalPaid.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {b.status === "preventivo" && (
                        <>
                          <Button size="sm" onClick={() => handleConfirm(b)}>
                            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                            Conferma
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPreventivo(b)}
                            disabled={generatingPreventivoPdf === b.id}
                          >
                            {generatingPreventivoPdf === b.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Printer className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Scarica Preventivo
                          </Button>
                        </>
                      )}
                      {b.status !== "preventivo" && b.status !== "cancellata" && b.status !== "rimborsata" && b.status !== "scaduto" && (
                        <Button size="sm" variant="outline" onClick={() => setDetailBooking(b)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Dettagli
                        </Button>
                      )}
                      {canDownloadAffido && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadAffido(b)}
                            disabled={generatingPdf === b.id}
                          >
                            {generatingPdf === b.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Modulo Affido
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPreventivo(b)}
                            disabled={generatingPreventivoPdf === b.id}
                          >
                            {generatingPreventivoPdf === b.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Printer className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Scarica Preventivo
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma Preventivo #{paymentDialog?.booking_number}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium">Riepilogo</p>
              <div className="flex justify-between text-sm">
                <span>Totale</span>
                <span className="font-bold">€ {Number(paymentDialog?.total_amount || 0).toFixed(2)}</span>
              </div>
              {paymentDialog?.deposit_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Caparra richiesta</span>
                  <span className="font-medium">€ {Number(paymentDialog.deposit_amount).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Scegli come pagare</p>

              {/* Stripe payment - only if tenant has Stripe configured */}
              {tenantHasStripe && (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => handleStripePayment(paymentDialog)}
                  disabled={payingStripe}
                >
                  {payingStripe ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  {payingStripe ? "Preparazione pagamento..." : "Paga con Carta"}
                </Button>
              )}

              {/* Bank transfer */}
              {tenant?.iban && (
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Bonifico Bancario</p>
                  </div>
                  <div className="space-y-1 text-xs">
                    {tenant.iban_holder && (
                      <p><span className="text-muted-foreground">Intestatario:</span> {tenant.iban_holder}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="flex-1">
                        <span className="text-muted-foreground">IBAN:</span> {tenant.iban}
                      </p>
                      <button onClick={copyIban} className="text-primary hover:text-primary/80">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {tenant.bank_name && (
                      <p><span className="text-muted-foreground">Banca:</span> {tenant.bank_name}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Indica nella causale il numero pratica #{paymentDialog?.booking_number}.
                    La conferma avverrà dopo la verifica del pagamento.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Dialog */}
      <ClienteBookingDetailDialog
        open={!!detailBooking}
        onOpenChange={(open) => !open && setDetailBooking(null)}
        booking={detailBooking}
        tenantId={tenant?.id || ""}
      />
    </div>
  );
}
