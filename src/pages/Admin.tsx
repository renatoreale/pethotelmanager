import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Building2, Users, ShieldCheck, Plus, Pencil, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";
import {
  useAllTenants, useCreateTenant, useUpdateTenant, useDeleteTenant,
  useAllUsers, useAddTenantRole, useRemoveTenantRole, useCreateUser,
  useUpdateUserProfile, useDeleteUser,
  useRolePermissions, useBulkUpsertPermissions,
  RESOURCES, ROLES, type Tenant, type UserWithProfile, type RolePermission,
} from "@/hooks/useAdmin";

type AppRole = Database["public"]["Enums"]["app_role"];

export default function Admin() {
  const { hasRole } = useAuth();

  if (!hasRole("admin")) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Accesso negato</CardTitle>
            <CardDescription>
              Solo gli amministratori di sistema possono accedere a questa sezione.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Amministrazione Sistema</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestione pensioni, utenti, ruoli e permessi
        </p>
      </div>

      <Tabs defaultValue="pensioni" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pensioni" className="gap-2">
            <Building2 className="h-4 w-4" /> Pensioni
          </TabsTrigger>
          <TabsTrigger value="utenti" className="gap-2">
            <Users className="h-4 w-4" /> Utenti & Ruoli
          </TabsTrigger>
          <TabsTrigger value="permessi" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> Permessi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pensioni"><PensioniTab /></TabsContent>
        <TabsContent value="utenti"><UtentiTab /></TabsContent>
        <TabsContent value="permessi"><PermessiTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PENSIONI TAB
// ══════════════════════════════════════════════════════════════════════════════
function PensioniTab() {
  const { data: tenants, isLoading } = useAllTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState<Tenant | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [numSingole, setNumSingole] = useState(0);
  const [numDoppie, setNumDoppie] = useState(0);

  const openNew = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setEmail("");
    setPhone("");
    setAddress("");
    setNumSingole(0);
    setNumDoppie(0);
    setDialogOpen(true);
  };

  const openEdit = (tenant: Tenant) => {
    setEditing(tenant);
    setName(tenant.name);
    setSlug(tenant.slug);
    setEmail(tenant.email || "");
    setPhone(tenant.phone || "");
    setAddress(tenant.address || "");
    setNumSingole(tenant.num_singole);
    setNumDoppie(tenant.num_doppie);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) return;

    if (editing) {
      await updateTenant.mutateAsync({
        id: editing.id,
        name,
        slug,
        email: email || null,
        phone: phone || null,
        address: address || null,
        num_singole: numSingole,
        num_doppie: numDoppie,
      });
    } else {
      await createTenant.mutateAsync({
        name,
        slug,
        email: email || null,
        phone: phone || null,
        address: address || null,
        num_singole: numSingole,
        num_doppie: numDoppie,
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteTenant.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Pensioni</CardTitle>
            <CardDescription>Gestisci le pensioni nel sistema</CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nuova Pensione
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !tenants?.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessuna pensione configurata</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Casette</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tenant.slug}</Badge>
                      </TableCell>
                      <TableCell>{tenant.email || "-"}</TableCell>
                      <TableCell>{tenant.phone || "-"}</TableCell>
                      <TableCell>
                        {tenant.num_singole} singole, {tenant.num_doppie} doppie
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(tenant)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Pensione" : "Nuova Pensione"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifica i dettagli della pensione" : "Crea una nuova pensione nel sistema"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pensione Milano" />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="milano" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Indirizzo</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Casette Singole</Label>
                <Input type="number" min={0} value={numSingole} onChange={(e) => setNumSingole(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Casette Doppie</Label>
                <Input type="number" min={0} value={numDoppie} onChange={(e) => setNumDoppie(Number(e.target.value))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={createTenant.isPending || updateTenant.isPending}>
              {editing ? "Salva" : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la pensione?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente la pensione "{deleting?.name}" e tutti i dati associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UTENTI TAB
// ══════════════════════════════════════════════════════════════════════════════
function UtentiTab() {
  const { data: users, isLoading: usersLoading } = useAllUsers();
  const { data: tenants } = useAllTenants();
  const addTenantRole = useAddTenantRole();
  const removeTenantRole = useRemoveTenantRole();
  const createUser = useCreateUser();
  const updateProfile = useUpdateUserProfile();
  const deleteUser = useDeleteUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editActiveTenant, setEditActiveTenant] = useState("");
  const [addRoleOpen, setAddRoleOpen] = useState<UserWithProfile | null>(null);
  
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    tenant_id: "",
    role: "operatore" as AppRole,
  });

  const [addRoleForm, setAddRoleForm] = useState({
    tenant_id: "",
    role: "operatore" as AppRole,
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleCreateUser = async () => {
    if (!form.email || !form.password || !form.full_name) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    if (!emailRegex.test(form.email)) {
      toast.error("Formato email non valido");
      return;
    }
    if (form.password.length < 6) {
      toast.error("La password deve avere almeno 6 caratteri");
      return;
    }
    
    await createUser.mutateAsync({
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      tenant_id: form.tenant_id || null,
      role: form.role,
    });
    
    setDialogOpen(false);
    setForm({ email: "", password: "", full_name: "", tenant_id: "", role: "operatore" });
  };

  const openEdit = (user: UserWithProfile) => {
    setEditingUser(user);
    setEditName(user.full_name || "");
    setEditPhone(user.phone || "");
    setEditActiveTenant(user.active_tenant_id || "");
  };

  const handleSaveEdit = async () => {
    if (!editingUser || !editName.trim()) return;
    
    // Update profile fields
    await updateProfile.mutateAsync({
      profileId: editingUser.id,
      full_name: editName.trim(),
      phone: editPhone.trim() || null,
    });
    
    // Update active tenant if changed
    if (editActiveTenant !== (editingUser.active_tenant_id || "")) {
      const setActiveTenantFn = supabase
        .from("profiles")
        .update({ tenant_id: editActiveTenant || null })
        .eq("id", editingUser.id);
      await setActiveTenantFn;
    }
    
    setEditingUser(null);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    await deleteUser.mutateAsync(deletingUser.user_id);
    setDeletingUser(null);
  };

  const openAddRole = (user: UserWithProfile) => {
    setAddRoleOpen(user);
    setAddRoleForm({ tenant_id: "", role: "operatore" });
  };

  const handleAddRole = async () => {
    if (!addRoleOpen || !addRoleForm.tenant_id) return;
    await addTenantRole.mutateAsync({
      userId: addRoleOpen.user_id,
      tenantId: addRoleForm.tenant_id,
      role: addRoleForm.role,
    });
    setAddRoleOpen(null);
  };

  const handleRemoveRole = async (roleId: string) => {
    await removeTenantRole.mutateAsync(roleId);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Utenti & Ruoli</CardTitle>
            <CardDescription>Gestisci gli utenti di sistema e le loro associazioni pensione-ruolo</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuovo Utente
          </Button>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !users?.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessun utente trovato</div>
          ) : (
            <div className="space-y-6">
              {users.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {user.full_name || "Utente Senza Nome"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Pensione attiva: {user.active_tenant_id ? 
                          tenants?.find(t => t.id === user.active_tenant_id)?.name || "Sconosciuta" : 
                          "Nessuna"
                        }
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openAddRole(user)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingUser(user)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Associazioni Pensione-Ruolo:</h4>
                    {user.tenant_roles.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nessuna associazione</p>
                    ) : (
                      <div className="space-y-2">
                        {user.tenant_roles.map((tenantRole) => (
                          <div 
                            key={tenantRole.id} 
                            className="flex items-center justify-between bg-muted/50 rounded p-2"
                          >
                            <div>
                              <span className="font-medium">{tenantRole.tenant_name}</span>
                              <Badge variant="secondary" className="ml-2">
                                {ROLES.find(r => r.value === tenantRole.role)?.label || tenantRole.role}
                              </Badge>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleRemoveRole(tenantRole.id)}
                              className="h-6 w-6"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Crea Utente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuovo Utente</DialogTitle>
            <DialogDescription>
              Crea un utente e assegnalo a una pensione con un ruolo specifico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Mario Rossi"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="mario@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Pensione</Label>
              <Select
                value={form.tenant_id}
                onValueChange={(val) => setForm({ ...form, tenant_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona pensione..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select
                value={form.role}
                onValueChange={(val) => setForm({ ...form, role: val as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona ruolo..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateUser} className="w-full mt-4" disabled={createUser.isPending}>
              {createUser.isPending ? "Creazione..." : "Crea Utente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Aggiungi Ruolo */}
      <Dialog open={!!addRoleOpen} onOpenChange={() => setAddRoleOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Associazione</DialogTitle>
            <DialogDescription>
              Aggiungi una nuova associazione pensione-ruolo per {addRoleOpen?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pensione *</Label>
              <Select
                value={addRoleForm.tenant_id}
                onValueChange={(val) => setAddRoleForm({ ...addRoleForm, tenant_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona pensione..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ruolo *</Label>
              <Select
                value={addRoleForm.role}
                onValueChange={(val) => setAddRoleForm({ ...addRoleForm, role: val as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona ruolo..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddRoleOpen(null)}>Annulla</Button>
              <Button onClick={handleAddRole} disabled={addTenantRole.isPending || !addRoleForm.tenant_id}>
                {addTenantRole.isPending ? "Aggiunta..." : "Aggiungi"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifica Utente */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Utente</DialogTitle>
            <DialogDescription>
              Modifica i dati dell'utente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Mario Rossi"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+39 333 1234567"
              />
            </div>
            <div className="space-y-2">
              <Label>Pensione Attiva</Label>
              <Select
                value={editActiveTenant}
                onValueChange={(val) => setEditActiveTenant(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nessuna pensione attiva" />
                </SelectTrigger>
                <SelectContent>
                  {tenants?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>Annulla</Button>
              <Button onClick={handleSaveEdit} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Elimina Utente */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'utente?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente l'utente "{deletingUser?.full_name || 'Senza nome'}" dal sistema.
              Tutti i dati associati verranno persi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PERMESSI TAB
// ══════════════════════════════════════════════════════════════════════════════
function PermessiTab() {
  const { data: permissions, isLoading } = useRolePermissions();
  const bulkUpsert = useBulkUpsertPermissions();
  const [localPerms, setLocalPerms] = useState<Map<string, { can_read: boolean; can_write: boolean; can_delete: boolean }>>(new Map());
  const [selectedRole, setSelectedRole] = useState<AppRole>("operatore");

  // Build a map of permissions for the selected role
  const getPermKey = (role: AppRole, resource: string) => `${role}:${resource}`;

  const getPerm = (resource: string) => {
    const key = getPermKey(selectedRole, resource);
    if (localPerms.has(key)) {
      return localPerms.get(key)!;
    }
    const existing = permissions?.find((p) => p.role === selectedRole && p.resource === resource);
    return {
      can_read: existing?.can_read ?? false,
      can_write: existing?.can_write ?? false,
      can_delete: existing?.can_delete ?? false,
    };
  };

  const setPerm = (resource: string, field: "can_read" | "can_write" | "can_delete", value: boolean) => {
    const key = getPermKey(selectedRole, resource);
    const current = getPerm(resource);
    setLocalPerms(new Map(localPerms).set(key, { ...current, [field]: value }));
  };

  const handleSave = async () => {
    const toSave: RolePermission[] = RESOURCES.map((res) => {
      const perm = getPerm(res.value);
      return {
        id: "",
        role: selectedRole,
        resource: res.value,
        can_read: perm.can_read,
        can_write: perm.can_write,
        can_delete: perm.can_delete,
        tenant_id: null,
      };
    });
    await bulkUpsert.mutateAsync(toSave);
    setLocalPerms(new Map());
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Permessi per Ruolo</CardTitle>
          <CardDescription>
            Configura i permessi di lettura, scrittura ed eliminazione per ogni pagina
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v as AppRole); setLocalPerms(new Map()); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={bulkUpsert.isPending}>
            <Save className="mr-2 h-4 w-4" /> Salva Permessi
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pagina</TableHead>
                  <TableHead className="text-center w-[100px]">Lettura</TableHead>
                  <TableHead className="text-center w-[100px]">Scrittura</TableHead>
                  <TableHead className="text-center w-[100px]">Eliminazione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RESOURCES.map((res) => {
                  const perm = getPerm(res.value);
                  return (
                    <TableRow key={res.value}>
                      <TableCell className="font-medium">{res.label}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_read}
                          onCheckedChange={(v) => setPerm(res.value, "can_read", !!v)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_write}
                          onCheckedChange={(v) => setPerm(res.value, "can_write", !!v)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_delete}
                          onCheckedChange={(v) => setPerm(res.value, "can_delete", !!v)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Legenda ruoli predefiniti:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>Admin:</strong> Accesso totale a tutto il sistema, gestione pensioni e utenti</li>
            <li><strong>CEO:</strong> Sola lettura di report globali su tutte le pensioni</li>
            <li><strong>Titolare:</strong> Pieno controllo sulla propria pensione</li>
            <li><strong>Manager:</strong> Operatività completa sulla pensione, senza configurazioni avanzate</li>
            <li><strong>Operatore:</strong> Solo visualizzazione e compiti assegnati</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
