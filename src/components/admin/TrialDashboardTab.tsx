import { useState, useEffect } from "react";
import { supabase as baseClient } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { format, isPast, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { Users, Clock, CheckCircle, XCircle, RefreshCw, Trash2, Search, Mail, Activity, History, Loader2 as Loader2Icon } from "lucide-react";
import { toast } from "sonner";

type TrialStatus = "richiesta" | "attiva" | "scaduta";

interface TrialUser {
  user_id: string;
  trial_id: string | null;
  full_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
  status: TrialStatus;
  trial_start: string | null;
  trial_end: string | null;
  days_remaining: number | null;
  last_sign_in_at: string | null;
  bookings_created: number;
  last_activity: { action: string; created_at: string } | null;
}

const ACTIVITY_LABELS: Record<string, string> = {
  registration_submitted: "Registrazione inviata",
  welcome_email_sent: "Email di benvenuto inviata",
  password_set: "Password impostata",
  first_login: "Primo accesso",
  login: "Accesso",
  preventivo_creato: "Preventivo creato",
  prenotazione_confermata: "Prenotazione confermata",
  check_in_effettuato: "Check-in effettuato",
  check_out_effettuato: "Check-out effettuato",
};

interface TrialActivityEvent {
  id: string;
  action: string;
  page: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

function getStatusBadge(status: TrialStatus, daysRemaining: number | null) {
  if (status === "richiesta") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Mail className="h-3 w-3" /> Richiesta
      </Badge>
    );
  }
  if (status === "attiva") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
        <CheckCircle className="h-3 w-3" />
        Attiva {daysRemaining !== null ? `(${daysRemaining}gg)` : ""}
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
  const { session } = useAuth();
  const supabase = useSupabase();
  const [users, setUsers] = useState<TrialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingUser, setDeletingUser] = useState<TrialUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Fetch auth users (includes trial data via service role)
      const authRes = await supabase.functions.invoke("admin-list-users");

      const authDetails: Record<string, {
        email: string;
        created_at: string;
        user_metadata: Record<string, any>;
        banned_until: string | null;
        last_sign_in_at: string | null;
        trial_id: string | null;
        trial_start: string | null;
        trial_end: string | null;
        is_converted: boolean;
        bookings_created: number;
        last_activity: { action: string; created_at: string } | null;
      }> = authRes.data?.userDetails || {};

      const trialUsers: TrialUser[] = [];

      for (const [userId, auth] of Object.entries(authDetails)) {
        const meta = auth.user_metadata || {};
        const trial = auth.trial_start ? auth : null;
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
            status = "attiva";
            daysRemaining = Math.max(0, differenceInDays(new Date(trial.trial_end), new Date()));
          }
        } else {
          status = "richiesta";
        }

        trialUsers.push({
          user_id: userId,
          trial_id: auth.trial_id || null,
          full_name: meta.full_name || null,
          email: auth.email,
          phone: meta.phone || null,
          created_at: auth.created_at,
          status,
          trial_start: trial?.trial_start || null,
          trial_end: trial?.trial_end || null,
          days_remaining: daysRemaining,
          last_sign_in_at: auth.last_sign_in_at || null,
          bookings_created: auth.bookings_created || 0,
          last_activity: auth.last_activity || null,
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

  useEffect(() => { if (session) fetchAll(); }, [session]);

  const [timelineUser, setTimelineUser] = useState<TrialUser | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TrialActivityEvent[]>([]);

  const openTimeline = async (u: TrialUser) => {
    setTimelineUser(u);
    if (!u.trial_id) {
      setTimelineEvents([]);
      return;
    }
    setTimelineLoading(true);
    try {
      const { data, error } = await baseClient.functions.invoke("admin-trial-timeline", {
        body: { trial_id: u.trial_id },
      });
      if (error) throw error;
      setTimelineEvents(data?.events || []);
    } catch (e: any) {
      toast.error("Errore nel caricamento della timeline: " + e.message);
      setTimelineEvents([]);
    }
    setTimelineLoading(false);
  };

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
  const inCorso = users.filter((u) => u.status === "attiva").length;
  const scaduta = users.filter((u) => u.status === "scaduta").length;
  const haUsato = users.filter((u) => u.bookings_created > 0).length;

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{haUsato} / {total}</div>
                <div className="text-xs text-muted-foreground">Hanno usato il prodotto</div>
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
                    <TableHead>Ultimo accesso</TableHead>
                    <TableHead>Attività</TableHead>
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
                      <TableCell className="text-muted-foreground text-sm">
                        {u.last_sign_in_at
                          ? format(new Date(u.last_sign_in_at), "dd MMM yyyy HH:mm", { locale: it })
                          : "Mai"}
                      </TableCell>
                      <TableCell>
                        {u.last_activity ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 w-fit">
                              {ACTIVITY_LABELS[u.last_activity.action] || u.last_activity.action}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(u.last_activity.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Nessuna
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openTimeline(u)}
                            title="Timeline registrazione"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingUser(u)}
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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

      {/* Timeline registrazione */}
      <Dialog open={!!timelineUser} onOpenChange={(open) => { if (!open) setTimelineUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Timeline registrazione
            </DialogTitle>
            <DialogDescription>
              {timelineUser?.full_name || timelineUser?.email}
            </DialogDescription>
          </DialogHeader>
          {timelineLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !timelineUser?.trial_id ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nessuna registrazione trial associata a questo account.
            </p>
          ) : !timelineEvents.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nessun passaggio ancora registrato.
            </p>
          ) : (
            <ol className="space-y-3 py-2">
              {timelineEvents.map((ev, i) => (
                <li key={ev.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    {i < timelineEvents.length - 1 && <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 16 }} />}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-medium">{ACTIVITY_LABELS[ev.action] || ev.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ev.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
