import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import {
  useGlobalCancellationPolicy,
  useSaveCancellationPolicy,
  type CancellationRule,
} from "@/hooks/useCancellationPolicy";

export function GlobalCancellationPolicyTab() {
  const { data: policy, isLoading } = useGlobalCancellationPolicy();
  const savePolicy = useSaveCancellationPolicy();

  const [adminFee, setAdminFee] = useState(0);
  const [rules, setRules] = useState<CancellationRule[]>([]);
  const [newDays, setNewDays] = useState<number>(15);
  const [newPct, setNewPct] = useState<number>(100);

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
    try {
      await savePolicy.mutateAsync({ tenantId: null, adminFee, rules });
      toast.success("Politica di cancellazione globale salvata");
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Caricamento...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Politica di Cancellazione Globale</CardTitle>
        <CardDescription>
          Template predefinito per le nuove pensioni. Configura le fasce di rimborso e la quota amministrativa.
        </CardDescription>
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
            Importo trattenuto dalla pensione per la gestione della pratica di cancellazione
          </p>
        </div>

        {/* Rules table */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Fasce di rimborso</Label>
          <p className="text-sm text-muted-foreground">
            Definisci le percentuali di rimborso in base ai giorni di anticipo rispetto al check-in.
            La prima fascia che corrisponde verrà applicata.
          </p>

          {rules.length > 0 && (
            <div className="rounded-md border">
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
          )}

          {/* Add new rule */}
          <div className="flex items-end gap-3">
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
          <Save className="mr-2 h-4 w-4" /> Salva Politica Globale
        </Button>
      </CardContent>
    </Card>
  );
}
