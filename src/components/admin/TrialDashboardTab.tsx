import { useState, useEffect } from "react";
import { supabase as baseClient } from "@/integrations/supabase/client";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isPast, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { Users, Clock, CheckCircle, XCircle, RefreshCw, Trash2, Search, Mail } from "lucide-react";
import { toast } from "sonner";

type TrialStatus = "richiesta" | "in_corso" | "scaduta";

interface TrialUser {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
  status: TrialStatus;
  trial_start: string | null;
  trial_end: string | null;
  days_remaining: number | null;
}

function getStatusBadge(status: TrialStatus, daysRemaining: number | null) {
  if (status === "richiesta") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Mail className="h-3 w-3" /> Richiesta
      </Badge>
    );
  }
  if (status === "in_corso") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
        <CheckCircle className="h-3 w-3" />
        In corso {daysRemaining !== null ? `(${daysRemaining}gg)` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Scaduta
    </Badge>
  );
}

export function TrialDashboardTab() {
  const supabase = useSupabase();
  const [users, setUsers] = useState<TrialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingUser, setDeletingUser] = useState<TrialUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch auth users + trial_registrations in parallel
      const [authRes, trialsRes] = await Promise.all([
        baseClient.functions.invoke("admin-list-users"),
        supabase.from("trial_registrations").select("user_id, trial_start, trial_end, is_converted"),
      ]);

      const authDetails: Record<string, {
        email: string;
        created_at: string;
        user_metadata: Record<string, any>;
        banned_until: string | null;
      }> = authRes.data?.userDetails || {};

      const trialsMap = new Map(
        (trialsRes.data || []).map((t: any) => [t.user_id, t])
      );

      const trialUsers: TrialUser[] = [];

      for (const [userId, auth] of Object.entries(authDetails)) {
        const meta = auth.user_metadata || {};
        const trial = trialsMap.get(userId) as any;
        const isBanned = auth.banned_until && new Date(auth.banned_until) > new Date();

        // Include only users with is_trial flag OR who have a trial_registration
        if (!meta.is_trial && !trial) continue;

        let status: TrialStatus;
        let daysRemaining: number | null = null;

        if (trial) {
          const expired = isPast(new Date(trial.trial_end)) || isBanned;
          if (expired) {
            status = "scaduta";
          } else {
            status = "in_corso";
            daysRemaining = Math.max(0, differenceInDays(new Date(trial.trial_end), new Date()));
          }
        } else {
          status = "richiesta";
        }

        trialUsers.push({
          user_id: userId,
          full_name: meta.full_name || null,
          email: auth.email,
          phone: meta.phone || null,
          created_at: auth.created_at,
          status,
          trial_start: trial?.trial_start || null,
          trial_end: trial?.trial_end || null,
          days_remaining: daysRemaining,
        });
      }

      // Sort: newest first
      trialUsers.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setUsers(trialUsers);
    } catch (e: any) {
      console.error("Error fetching trial users:", e);
      toast.error("Errore nel caricamento utenze trial");
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      const { data, error } = await baseClient.functions.invoke("admin-delete-user", {
        body: { user_id: deletingUser.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Utenza eliminata");
      setDeletingUser(null);
      fetchAll();
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    }
    setDeleting(false);
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.phone || "").includes(s)
    );
  });

  const total = users.length;
  const richiesta = users.filter((u) => u.status === "richiesta").length;
  const inCorso = users.filter((u) => u.status === "in_corso").length;
  const scaduta = users.filter((u) => u.status === "scaduta").length;

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs text-muted-foreground">Totale richieste</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{richiesta}</div>
                <div className="text-xs text-muted-foreground">In attesa accesso</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{inCorso}</div>
                <div className="text-xs text-muted-foreground">Trial in corso</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{scaduta}</div>
                <div className="text-xs text-muted-foreground">Trial scaduti</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Prove Gratuite</CardTitle>
            <CardDescription>Tutte le utenze che hanno richiesto la prova gratuita</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca nome, email, telefono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-[260px]"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !filtered.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessuna utenza trovata</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Richiesta il</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(u.created_at), "dd MMM yyyy", { locale: it })}
                      </TableCell>
                      <TableCell>{getStatusBadge(u.status, u.days_remaining)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.trial_end
                          ? format(new Date(u.trial_end), "dd MMM yyyy", { locale: it })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingUser(u)}
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'utenza?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente l'utenza di{" "}
              <strong>{deletingUser?.full_name || deletingUser?.email}</strong>.
              L'operazione non è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
