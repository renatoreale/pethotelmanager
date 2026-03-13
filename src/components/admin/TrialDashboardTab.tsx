import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isPast } from "date-fns";
import { it } from "date-fns/locale";
import {
  Users, UserCheck, UserX, Clock, TrendingUp,
  RefreshCw, Pencil, Trash2, Ban, CheckCircle, Building2, Search,
  UserPlus, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthUserDetail {
  email: string;
  created_at: string;
  confirmed_at: string | null;
  banned_until: string | null;
  last_sign_in_at: string | null;
  user_metadata: Record<string, any>;
}

interface FullUser {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  roles: { id: string; role: AppRole; tenant_id: string | null; tenant_name: string }[];
  auth: AuthUserDetail | null;
  trial: {
    id: string;
    trial_start: string;
    trial_end: string;
    is_converted: boolean;
    login_count: number;
    actions_count: number;
  } | null;
}

type FilterType = "all" | "trial_active" | "trial_expired" | "active" | "banned" | "no_role";

export function TrialDashboardTab() {
  const [users, setUsers] = useState<FullUser[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  // Edit dialog
  const [editUser, setEditUser] = useState<FullUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("titolare");
  const [editTenant, setEditTenant] = useState("");
  const [saving, setSaving] = useState(false);

  // Convert trial dialog
  const [convertUser, setConvertUser] = useState<FullUser | null>(null);
  const [convertTenant, setConvertTenant] = useState("");
  const [converting, setConverting] = useState(false);

  // Delete/Ban
  const [deletingUser, setDeletingUser] = useState<FullUser | null>(null);
  const [banningUser, setBanningUser] = useState<{ user: FullUser; ban: boolean } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes, tenantsRes, trialsRes, authRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("tenants").select("id, name").order("name"),
        supabase.from("trial_registrations").select("*"),
        supabase.functions.invoke("admin-list-users"),
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const tenantList = tenantsRes.data || [];
      const trials = trialsRes.data || [];
      const authDetails: Record<string, AuthUserDetail> = authRes.data?.userDetails || {};
      const emailMap: Record<string, string> = authRes.data?.emails || {};

      setTenants(tenantList);
      const tenantMap = new Map(tenantList.map(t => [t.id, t.name]));

      const fullUsers: FullUser[] = profiles.map(p => {
        const userRoles = roles.filter(r => r.user_id === p.user_id);
        const trial = trials.find(t => t.user_id === p.user_id);
        const auth = authDetails[p.user_id] || null;

        return {
          profile_id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          phone: p.phone,
          email: emailMap[p.user_id] || auth?.email || null,
          tenant_id: p.tenant_id,
          tenant_name: p.tenant_id ? (tenantMap.get(p.tenant_id) || null) : null,
          roles: userRoles.map(r => ({
            id: r.id,
            role: r.role as AppRole,
            tenant_id: r.tenant_id,
            tenant_name: tenantMap.get(r.tenant_id || "") || "Globale",
          })),
          auth,
          trial: trial ? {
            id: trial.id,
            trial_start: trial.trial_start,
            trial_end: trial.trial_end,
            is_converted: trial.is_converted,
            login_count: trial.login_count,
            actions_count: trial.actions_count,
          } : null,
        };
      });

      // Sort: newest first
      fullUsers.sort((a, b) => {
        const dateA = a.auth?.created_at || "";
        const dateB = b.auth?.created_at || "";
        return dateB.localeCompare(dateA);
      });

      setUsers(fullUsers);
    } catch (e: any) {
      console.error("Error fetching users:", e);
      toast.error("Errore nel caricamento utenti");
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // KPIs
  const totalUsers = users.length;
  const trialActive = users.filter(u => u.trial && !u.trial.is_converted && !isPast(new Date(u.trial.trial_end))).length;
  const trialExpired = users.filter(u => u.trial && !u.trial.is_converted && isPast(new Date(u.trial.trial_end))).length;
  const converted = users.filter(u => u.trial?.is_converted).length;
  const banned = users.filter(u => u.auth?.banned_until && new Date(u.auth.banned_until) > new Date()).length;
  const noRole = users.filter(u => u.roles.length === 0).length;

  // Filtered users
  const filteredUsers = useMemo(() => {
    let result = users;
    switch (filter) {
      case "trial_active":
        result = result.filter(u => u.trial && !u.trial.is_converted && !isPast(new Date(u.trial.trial_end)));
        break;
      case "trial_expired":
        result = result.filter(u => u.trial && !u.trial.is_converted && isPast(new Date(u.trial.trial_end)));
        break;
      case "active":
        result = result.filter(u => u.roles.length > 0 && !u.trial);
        break;
      case "banned":
        result = result.filter(u => u.auth?.banned_until && new Date(u.auth.banned_until) > new Date());
        break;
      case "no_role":
        result = result.filter(u => u.roles.length === 0);
        break;
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(u =>
        (u.full_name || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s)
      );
    }
    return result;
  }, [users, filter, search]);

  // Status badge
  const getUserStatus = (u: FullUser) => {
    const isBanned = u.auth?.banned_until && new Date(u.auth.banned_until) > new Date();
    if (isBanned) return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Disattivato</Badge>;
    if (u.trial && !u.trial.is_converted && isPast(new Date(u.trial.trial_end)))
      return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" /> Trial scaduto</Badge>;
    if (u.trial && !u.trial.is_converted)
      return <Badge className="bg-warning text-warning-foreground gap-1"><Clock className="h-3 w-3" /> Trial attivo</Badge>;
    if (u.trial?.is_converted)
      return <Badge className="bg-accent text-accent-foreground gap-1"><CheckCircle className="h-3 w-3" /> Convertito</Badge>;
    if (u.roles.length === 0)
      return <Badge variant="outline" className="gap-1"><ShieldAlert className="h-3 w-3" /> Senza ruolo</Badge>;
    return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" /> Attivo</Badge>;
  };

  // Edit handlers
  const openEdit = (u: FullUser) => {
    setEditUser(u);
    setEditName(u.full_name || "");
    setEditEmail(u.email || "");
    setEditPhone(u.phone || "");
    setEditRole(u.roles[0]?.role || "titolare");
    setEditTenant(u.roles[0]?.tenant_id || u.tenant_id || "");
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      // Update profile
      await supabase.from("profiles").update({
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
      }).eq("id", editUser.profile_id);

      // Update email if changed
      if (editEmail.trim() && editEmail.trim() !== editUser.email) {
        await supabase.functions.invoke("admin-update-user", {
          body: { user_id: editUser.user_id, email: editEmail.trim() },
        });
      }

      // Update role if changed
      if (editUser.roles.length > 0) {
        const currentRole = editUser.roles[0];
        if (currentRole.role !== editRole || currentRole.tenant_id !== editTenant) {
          await supabase.from("user_roles").update({
            role: editRole,
            tenant_id: editTenant || null,
          }).eq("id", currentRole.id);
        }
      } else if (editRole && editTenant) {
        // Add role if user has none
        await supabase.from("user_roles").insert({
          user_id: editUser.user_id,
          role: editRole,
          tenant_id: editTenant,
        });
      }

      // Update active tenant
      if (editTenant && editTenant !== editUser.tenant_id) {
        await supabase.from("profiles").update({ tenant_id: editTenant }).eq("id", editUser.profile_id);
      }

      toast.success("Utente aggiornato");
      setEditUser(null);
      fetchAll();
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    }
    setSaving(false);
  };

  // Convert trial to real tenant
  const handleConvert = async () => {
    if (!convertUser || !convertTenant) return;
    setConverting(true);
    try {
      // Update user role to point to real tenant
      if (convertUser.roles.length > 0) {
        await supabase.from("user_roles").update({
          tenant_id: convertTenant,
        }).eq("id", convertUser.roles[0].id);
      } else {
        await supabase.from("user_roles").insert({
          user_id: convertUser.user_id,
          role: "titolare",
          tenant_id: convertTenant,
        });
      }

      // Update profile tenant
      await supabase.from("profiles").update({
        tenant_id: convertTenant,
      }).eq("id", convertUser.profile_id);

      // Mark trial as converted
      if (convertUser.trial) {
        await supabase.from("trial_registrations").update({
          is_converted: true,
          converted_at: new Date().toISOString(),
          tenant_id: convertTenant,
        }).eq("id", convertUser.trial.id);
      }

      toast.success("Utente convertito e associato alla pensione");
      setConvertUser(null);
      setConvertTenant("");
      fetchAll();
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    }
    setConverting(false);
  };

  // Ban/Unban
  const handleBan = async () => {
    if (!banningUser) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-ban-user", {
        body: { user_id: banningUser.user.user_id, ban: banningUser.ban },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(banningUser.ban ? "Utente disattivato" : "Utente riattivato");
      setBanningUser(null);
      fetchAll();
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: deletingUser.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Utente eliminato");
      setDeletingUser(null);
      fetchAll();
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    }
  };

  const isBanned = (u: FullUser) => u.auth?.banned_until && new Date(u.auth.banned_until) > new Date();

  // Non-trial tenants (exclude trial-created ones)
  const realTenants = tenants;

  const ROLES: { value: AppRole; label: string }[] = [
    { value: "admin", label: "Admin" },
    { value: "ceo", label: "CEO" },
    { value: "titolare", label: "Titolare" },
    { value: "manager", label: "Manager" },
    { value: "operatore", label: "Operatore" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("all")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <div className="text-xs text-muted-foreground">Totale utenti</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("trial_active")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-warning" />
              <div>
                <div className="text-2xl font-bold">{trialActive}</div>
                <div className="text-xs text-muted-foreground">Trial attivi</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("trial_expired")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserX className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{trialExpired}</div>
                <div className="text-xs text-muted-foreground">Trial scaduti</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("active")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-accent" />
              <div>
                <div className="text-2xl font-bold">{converted}</div>
                <div className="text-xs text-muted-foreground">Convertiti</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("banned")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Ban className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{banned}</div>
                <div className="text-xs text-muted-foreground">Disattivati</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("no_role")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{noRole}</div>
                <div className="text-xs text-muted-foreground">Senza ruolo</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Gestione Utenze</CardTitle>
            <CardDescription>Tutte le utenze registrate nel sistema</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca nome o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-[250px]"
              />
            </div>
            <Select value={filter} onValueChange={v => setFilter(v as FilterType)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="trial_active">Trial attivi</SelectItem>
                <SelectItem value="trial_expired">Trial scaduti</SelectItem>
                <SelectItem value="active">Attivi (no trial)</SelectItem>
                <SelectItem value="banned">Disattivati</SelectItem>
                <SelectItem value="no_role">Senza ruolo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !filteredUsers.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessun utente trovato</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Pensione</TableHead>
                    <TableHead>Registrazione</TableHead>
                    <TableHead>Ultimo accesso</TableHead>
                    <TableHead className="w-[160px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => (
                    <TableRow key={u.profile_id} className={isBanned(u) ? "opacity-60" : ""}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{u.full_name || "Senza nome"}</div>
                          <div className="text-xs text-muted-foreground">{u.email || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getUserStatus(u)}</TableCell>
                      <TableCell>
                        {u.roles.length > 0
                          ? u.roles.map(r => (
                            <Badge key={r.id} variant="secondary" className="mr-1">
                              {ROLES.find(rl => rl.value === r.role)?.label || r.role}
                            </Badge>
                          ))
                          : <span className="text-muted-foreground italic text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {u.roles.length > 0
                            ? u.roles.map(r => r.tenant_name).filter(Boolean).join(", ") || "—"
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.auth?.created_at
                          ? format(new Date(u.auth.created_at), "dd MMM yyyy", { locale: it })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.auth?.last_sign_in_at
                          ? format(new Date(u.auth.last_sign_in_at), "dd/MM HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Modifica">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {u.trial && !u.trial.is_converted && (
                            <Button variant="ghost" size="icon" onClick={() => { setConvertUser(u); setConvertTenant(""); }} title="Converti a pensione">
                              <Building2 className="h-4 w-4 text-accent" />
                            </Button>
                          )}
                          {isBanned(u) ? (
                            <Button variant="ghost" size="icon" onClick={() => setBanningUser({ user: u, ban: false })} title="Riattiva">
                              <CheckCircle className="h-4 w-4 text-accent" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => setBanningUser({ user: u, ban: true })} title="Disattiva">
                              <Ban className="h-4 w-4 text-warning" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setDeletingUser(u)} title="Elimina">
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

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifica Utente</DialogTitle>
            <DialogDescription>Modifica dati, ruolo e pensione dell'utente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select value={editRole} onValueChange={v => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pensione</Label>
              <Select value={editTenant} onValueChange={setEditTenant}>
                <SelectTrigger><SelectValue placeholder="Seleziona pensione..." /></SelectTrigger>
                <SelectContent>
                  {realTenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editUser?.trial && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Info Trial</div>
                <div>Inizio: {format(new Date(editUser.trial.trial_start), "dd MMM yyyy", { locale: it })}</div>
                <div>Fine: {format(new Date(editUser.trial.trial_end), "dd MMM yyyy", { locale: it })}</div>
                <div>Accessi: {editUser.trial.login_count} | Azioni: {editUser.trial.actions_count}</div>
                <div>Convertito: {editUser.trial.is_converted ? "Sì" : "No"}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annulla</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Trial Dialog */}
      <Dialog open={!!convertUser} onOpenChange={() => setConvertUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" /> Converti Trial in Pensione
            </DialogTitle>
            <DialogDescription>
              Associa l'utente "{convertUser?.full_name || convertUser?.email}" a una pensione reale. 
              Il ruolo rimarrà "Titolare" e il trial verrà marcato come convertito.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pensione di destinazione *</Label>
              <Select value={convertTenant} onValueChange={setConvertTenant}>
                <SelectTrigger><SelectValue placeholder="Seleziona la pensione..." /></SelectTrigger>
                <SelectContent>
                  {realTenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertUser(null)}>Annulla</Button>
            <Button onClick={handleConvert} disabled={!convertTenant || converting}>
              {converting ? "Conversione..." : "Converti e Associa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban/Unban Confirm */}
      <AlertDialog open={!!banningUser} onOpenChange={() => setBanningUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banningUser?.ban ? "Disattivare l'utente?" : "Riattivare l'utente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {banningUser?.ban
                ? `L'utente "${banningUser.user.full_name || banningUser.user.email}" non potrà più accedere al sistema.`
                : `L'utente "${banningUser?.user.full_name || banningUser?.user.email}" potrà nuovamente accedere al sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBan}
              className={banningUser?.ban ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {banningUser?.ban ? "Disattiva" : "Riattiva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'utente?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente l'utente "{deletingUser?.full_name || deletingUser?.email}" e tutti i suoi dati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
