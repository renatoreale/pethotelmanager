import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  useCancellationPolicy,
  useSaveCancellationPolicy,
  type CancellationRule,
} from "@/hooks/useCancellationPolicy";

export function CancellationPolicyTab() {
  const supabase = useSupabase();
  const { profile } = useAuth();
  const { data: policy, isLoading } = useCancellationPolicy();
  const savePolicy = useSaveCancellationPolicy();
  const queryClient = useQueryClient();

  const [adminFee, setAdminFee] = useState(0);
  const [rules, setRules] = useState<CancellationRule[]>([]);
  const [newDays, setNewDays] = useState<number>(15);
  const [newPct, setNewPct] = useState<number>(100);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (policy) {
      setAdminFee(policy.admin_fee);
      setRules(policy.rules);
    }
  }, [policy]);

  const addRule = () => {
    if (rules.some((r) => r.days_before_checkin === newDays)) {
      toast.error("Esiste già una regola per questo numero di giorni");
      return;
    }
    const updated = [...rules, { days_before_checkin: newDays, refund_percentage: newPct }]
      .sort((a, b) => b.days_before_checkin - a.days_before_checkin);
    setRules(updated);
  };

  const removeRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!profile?.tenant_id) return;
    try {
      await savePolicy.mutateAsync({ tenantId: profile.tenant_id, adminFee, rules });
      toast.success("Politica di cancellazione salvata");
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  const handleReset = async () => {
    if (!profile?.tenant_id) return;
    setResetting(true);
    try {
      const { error } = await supabase.rpc("reset_tenant_cancellation_policy" as any, {
        _tenant_id: profile.tenant_id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["cancellation-policy"] });
      toast.success("Politica ripristinata ai valori predefiniti");
    } catch (err: any) {
      toast.error(err.message || "Errore nel ripristino");
    }
    setResetting(false);
    setResetConfirm(false);
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Caricamento...</div>;

  return (
    <>
      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Politica di Cancellazione</CardTitle>
            <CardDescription>
              Configura le regole di rimborso per le prenotazioni cancellate
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setResetConfirm(true)} disabled={resetting} className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Predefiniti
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Admin fee */}
          <div className="space-y-2 max-w-xs">
            <Label>Quota gestione pratica (€)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={adminFee}
              onChange={(e) => setAdminFee(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Importo trattenuto per la gestione della pratica
            </p>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Fasce di rimborso</Label>

            {rules.length > 0 && (
              <>
                {/* Mobile: card list */}
                <div className="sm:hidden space-y-2">
                  {rules.map((rule, idx) => (
                    <div key={idx} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <p className="font-medium">≥ {rule.days_before_checkin} giorni prima</p>
                        <p className="text-muted-foreground">Rimborso: {rule.refund_percentage}%</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeRule(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="border rounded-lg p-3 bg-muted/50 text-sm text-muted-foreground">
                    &lt; {rules[rules.length - 1].days_before_checkin} giorni — 0% (nessun rimborso)
                  </div>
                </div>
                {/* Desktop: table */}
                <div className="hidden sm:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Giorni prima del check-in</TableHead>
                        <TableHead>Rimborso %</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            ≥ {rule.days_before_checkin} giorni
                          </TableCell>
                          <TableCell>{rule.refund_percentage}%</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeRule(idx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">
                          &lt; {rules.length > 0 ? rules[rules.length - 1].days_before_checkin : 0} giorni
                        </TableCell>
                        <TableCell className="text-muted-foreground">0% (nessun rimborso)</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Giorni prima</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-28"
                  value={newDays}
                  onChange={(e) => setNewDays(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rimborso %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-28"
                  value={newPct}
                  onChange={(e) => setNewPct(Number(e.target.value))}
                />
              </div>
              <Button variant="outline" onClick={addRule}>
                <Plus className="mr-1 h-4 w-4" /> Aggiungi
              </Button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={savePolicy.isPending}>
            <Save className="mr-2 h-4 w-4" /> Salva Politica
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare i valori predefiniti?</AlertDialogTitle>
            <AlertDialogDescription>
              La politica di cancellazione verrà sovrascritta con il template globale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Ripristina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
