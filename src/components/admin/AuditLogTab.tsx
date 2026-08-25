import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Loader2, RefreshCw, History, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useAuditLog, useAuditLogSiblings, useRestoreAuditRecord, type AuditLogEntry } from "@/hooks/useAuditLog";
import { useAllTenants, useAllUsers } from "@/hooks/useAdmin";

const AUDITED_TABLES = [
  "clients", "cats", "cat_registry",
  "bookings", "booking_cats", "appointments", "cage_overrides",
  "quote_requests", "documents", "planning_tasks",
  "payments", "payment_methods", "payment_split_configs", "price_lists",
  "cancellation_policies", "cancellation_policy_rules", "slot_configs",
  "profiles", "user_roles", "tenants", "tenant_stripe_keys", "system_config",
];

const OPERATION_LABELS: Record<string, { label: string; className: string }> = {
  INSERT: { label: "Creazione", className: "bg-green-100 text-green-800 border-green-200" },
  UPDATE: { label: "Modifica", className: "bg-blue-100 text-blue-800 border-blue-200" },
  DELETE: { label: "Eliminazione", className: "bg-red-100 text-red-800 border-red-200" },
  RESTORE: { label: "Ripristino", className: "bg-purple-100 text-purple-800 border-purple-200" },
};

function OperationBadge({ operation }: { operation: string }) {
  const cfg = OPERATION_LABELS[operation] ?? { label: operation, className: "" };
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}

function DataView({ data, compareWith }: { data: Record<string, any> | null; compareWith?: Record<string, any> | null }) {
  if (!data) return <p className="text-sm text-muted-foreground italic">Nessun dato (il record non esisteva)</p>;
  const keys = Object.keys(data).sort();
  return (
    <div className="space-y-0.5 text-sm max-h-96 overflow-y-auto pr-1">
      {keys.map((k) => {
        const changed = compareWith ? JSON.stringify(compareWith[k]) !== JSON.stringify(data[k]) : false;
        const v = data[k];
        const display = v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
        return (
          <div key={k} className={`flex gap-2 py-0.5 rounded px-1 ${changed ? "bg-amber-100 dark:bg-amber-950/40" : ""}`}>
            <span className="font-mono text-xs text-muted-foreground shrink-0 w-40 truncate" title={k}>{k}</span>
            <span className="break-all">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AuditLogTab() {
  const [tableName, setTableName] = useState("");
  const [operation, setOperation] = useState("");
  const [recordId, setRecordId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [limit, setLimit] = useState(50);
  const [detail, setDetail] = useState<AuditLogEntry | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AuditLogEntry | null>(null);

  const { data: entries, isLoading, refetch, isFetching } = useAuditLog({ tableName, operation, recordId, tenantId, limit });
  const { data: tenants } = useAllTenants();
  const { data: users } = useAllUsers();
  const { data: siblings } = useAuditLogSiblings(detail?.operation_id ?? null, detail?.id);
  const restore = useRestoreAuditRecord();

  const tenantName = (id: string | null) => (id ? tenants?.find((t) => t.id === id)?.name ?? id.slice(0, 8) : "—");
  const userLabel = (id: string | null) => {
    if (!id) return "Sistema";
    const u = users?.find((u) => u.user_id === id);
    return u?.full_name || u?.email || id.slice(0, 8);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restore.mutateAsync(restoreTarget.id);
      toast.success("Record ripristinato con successo");
      setRestoreTarget(null);
      setDetail(null);
    } catch (err: any) {
      toast.error(err.message || "Errore durante il ripristino");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Storico Modifiche</CardTitle>
          <CardDescription className="mt-1">
            Tutte le operazioni registrate sul database, con possibilità di ripristinare una versione precedente di un record.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtri */}
        <div className="flex flex-wrap gap-2">
          <Select value={tableName || "all"} onValueChange={(v) => setTableName(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tutte le tabelle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le tabelle</SelectItem>
              {AUDITED_TABLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={operation || "all"} onValueChange={(v) => setOperation(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tutte le operazioni" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le operazioni</SelectItem>
              <SelectItem value="INSERT">Creazione</SelectItem>
              <SelectItem value="UPDATE">Modifica</SelectItem>
              <SelectItem value="DELETE">Eliminazione</SelectItem>
              <SelectItem value="RESTORE">Ripristino</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tenantId || "all"} onValueChange={(v) => setTenantId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tutte le pensioni" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le pensioni</SelectItem>
              {tenants?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="ID record (per vedere lo storico di uno specifico)"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            className="w-[320px]"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !entries?.length ? (
          <p className="text-center text-muted-foreground py-12 text-sm">Nessuna operazione registrata per questi filtri.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tabella</TableHead>
                    <TableHead>Operazione</TableHead>
                    <TableHead>Pensione</TableHead>
                    <TableHead>Utente</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(e.created_at)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.table_name}</TableCell>
                      <TableCell><OperationBadge operation={e.operation} /></TableCell>
                      <TableCell className="text-sm">{tenantName(e.tenant_id)}</TableCell>
                      <TableCell className="text-sm">{userLabel(e.user_id)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setDetail(e)}>
                          <Eye className="h-3.5 w-3.5" /> Dettagli
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {entries.length >= limit && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 50)}>
                  Carica altri
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Dialog dettagli */}
      <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detail && <OperationBadge operation={detail.operation} />}
              <span className="font-mono text-sm">{detail?.table_name}</span>
            </DialogTitle>
            <DialogDescription>
              {detail && `${formatDate(detail.created_at)} · ${userLabel(detail.user_id)} (${detail.user_role ?? "—"}) · ${tenantName(detail.tenant_id)}`}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Prima</p>
                <DataView data={detail.before_data} compareWith={detail.after_data} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Dopo</p>
                <DataView data={detail.after_data} compareWith={detail.before_data} />
              </div>
            </div>
          )}

          {!!siblings?.length && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Altre tabelle modificate nella stessa operazione ({siblings.length})
              </p>
              <div className="space-y-1">
                {siblings.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDetail(s)}
                    className="w-full flex items-center gap-2 text-left text-sm rounded px-2 py-1.5 border hover:bg-muted/50 transition-colors"
                  >
                    <OperationBadge operation={s.operation} />
                    <span className="font-mono text-xs">{s.table_name}</span>
                    <span className="font-mono text-xs text-muted-foreground truncate">{s.record_id.slice(0, 8)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {detail?.before_data && (
              <Button onClick={() => setRestoreTarget(detail)} className="gap-2">
                <History className="h-4 w-4" /> Ripristina alla versione "Prima"
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conferma ripristino */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(open) => { if (!open) setRestoreTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annullare questa modifica?</AlertDialogTitle>
            <AlertDialogDescription>
              Il record <strong className="font-mono">{restoreTarget?.record_id.slice(0, 8)}</strong> nella tabella{" "}
              <strong className="font-mono">{restoreTarget?.table_name}</strong> tornerà allo stato precedente a questa{" "}
              {restoreTarget?.operation === "DELETE" ? "eliminazione" : "modifica"} (registrata il{" "}
              {restoreTarget && formatDate(restoreTarget.created_at)}). Lo stato attuale non va perso: resterà comunque
              tracciato nello storico come qualsiasi altra modifica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restore.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restore.isPending} className="gap-1.5">
              {restore.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
              {restore.isPending ? "Ripristino..." : "Ripristina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
