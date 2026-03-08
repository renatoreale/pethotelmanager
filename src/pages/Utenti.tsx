import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "ceo", label: "CEO" },
  { value: "titolare", label: "Titolare" },
  { value: "manager", label: "Manager" },
  { value: "operatore", label: "Operatore" },
];

export default function Utenti() {
  const { users, isLoading, assignRole } = useUsers();
  const { hasRole } = useAuth();

  const canManageRoles = hasRole("admin") || hasRole("titolare");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Utenti & Ruoli</h1>
        <p className="text-muted-foreground text-sm">
          Gestione degli utenti e assegnazione dei ruoli all'interno della pensione.
        </p>
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
