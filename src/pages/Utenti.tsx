import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { useAllTenants, useCreateUser, ROLES } from "@/hooks/useAdmin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database } from "@/integrations/supabase/types";
import { UserPlus } from "lucide-react";

type AppRole = Database["public"]["Enums"]["app_role"];

export default function Utenti() {
  const { users, isLoading, assignRole } = useUsers();
  const { hasRole } = useAuth();
  const { data: tenants } = useAllTenants();
  const createUser = useCreateUser();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    tenant_id: "",
    role: "operatore" as AppRole,
  });

  const canManageRoles = hasRole("admin") || hasRole("titolare");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleCreateUser = async () => {
    if (!form.email || !form.password || !form.full_name) return;
    if (!emailRegex.test(form.email)) {
      toast.error("Formato email non valido");
      return;
    }
    if (form.password.length < 6) {
      toast.error("La password deve avere almeno 6 caratteri");
      return;
    }
    await createUser.mutateAsync({
      ...form,
      tenant_id: form.tenant_id || null,
    });
    setOpen(false);
    setForm({ email: "", password: "", full_name: "", tenant_id: "", role: "operatore" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utenti & Ruoli</h1>
          <p className="text-muted-foreground text-sm">
            Gestione degli utenti e assegnazione dei ruoli all'interno della pensione.
          </p>
        </div>
        {canManageRoles && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Nuovo Utente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Nuovo Utente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Mario Rossi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="mario@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
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
                <Button 
                  onClick={handleCreateUser} 
                  className="w-full mt-4"
                  disabled={createUser.isPending}
                >
                  {createUser.isPending ? "Creazione..." : "Crea Utente"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome Utente</TableHead>
              <TableHead>Ruolo Attuale</TableHead>
              {canManageRoles && <TableHead>Assegna Ruolo</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  {canManageRoles && <TableCell><Skeleton className="h-8 w-[150px]" /></TableCell>}
                </TableRow>
              ))
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManageRoles ? 3 : 2} className="text-center h-24 text-muted-foreground">
                  Nessun utente trovato.
                </TableCell>
              </TableRow>
            ) : (
              users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name || "Utente Senza Nome"}
                  </TableCell>
                  <TableCell>
                    {u.role ? (
                      <Badge variant={u.role === "admin" || u.role === "titolare" ? "default" : "secondary"}>
                        {u.role}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Nessun ruolo assegnato</span>
                    )}
                  </TableCell>
                  {canManageRoles && (
                    <TableCell>
                      <Select
                        defaultValue={u.role || undefined}
                        onValueChange={(val) => 
                          assignRole.mutate({ 
                            userId: u.user_id, 
                            role: val as AppRole, 
                            existingRoleId: u.role_id 
                          })
                        }
                      >
                        <SelectTrigger className="w-[180px]">
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
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
