import { useState } from "react";
import { useClients, useDeleteClient, type Client } from "@/hooks/useClients";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, AlertTriangle, Mail } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { HelpButton } from "@/components/HelpButton";
import { clientiHelpSections } from "@/components/help/clientiHelp";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

export default function Clienti() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [inviteClient, setInviteClient] = useState<Client | null>(null);
  const [inviting, setInviting] = useState(false);
  

  const { data: clients, isLoading } = useClients(search);
  const deleteClient = useDeleteClient();

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingClient(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    try {
      await deleteClient.mutateAsync(deletingClient.id);
      toast.success(t("clients.deleted"));
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
    setDeletingClient(null);
  };

  const handleInvite = async () => {
    if (!inviteClient) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-client", {
        body: { client_id: inviteClient.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(`${t("clients.inviteSuccess")}`);
      setInviteClient(null);
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("clients.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("clients.subtitle")} · {clients?.length ?? 0} {t("common.registered")}
            </p>
          </div>
          <HelpButton
            pageTitle="Guida — Clienti"
            pageDescription="Come gestire l'anagrafica clienti, invitare al portale e utilizzare la blacklist."
            sections={clientiHelpSections}
          />
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" /> {t("clients.newClient")}
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("clients.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
          ) : !clients?.length ? (
            <div className="py-12 text-center text-muted-foreground">
              {search ? t("common.noResults") : t("clients.noClients")}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("common.email")}</TableHead>
                    <TableHead>{t("common.phone")}</TableHead>
                    <TableHead>{t("clients.animals")}</TableHead>
                    <TableHead>{t("clients.portal")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="w-[130px]">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client: any) => (
                    <TableRow key={client.id} className={client.is_blacklisted ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {client.is_blacklisted && (
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          {client.last_name} {client.first_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{client.phone ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {client.cats?.length
                          ? client.cats.map((c: any) => c.name).join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {client.user_id && client.portal_activated ? (
                          <Badge variant="default" className="text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Attivo
                          </Badge>
                        ) : client.user_id ? (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Mail className="h-3 w-3" />
                            Inviato
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Non inviato</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.is_blacklisted ? (
                          <Badge variant="destructive" className="text-xs">{t("clients.blacklist")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{t("common.active")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!client.user_id && client.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("clients.inviteTitle")}
                              onClick={() => {
                                setInviteClient(client);
                                setInviteResult(null);
                              }}
                            >
                              <Mail className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingClient(client)}>
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

      <ClientDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingClient(null);
        }}
        client={editingClient}
      />

      <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingClient && t("clients.deleteDescription", { name: `${deletingClient.first_name} ${deletingClient.last_name}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!inviteClient} onOpenChange={() => { setInviteClient(null); setInviteResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("clients.inviteTitle")}</DialogTitle>
            <DialogDescription>
              {inviteClient && t("clients.inviteDescription", { name: `${inviteClient.first_name} ${inviteClient.last_name}`, email: inviteClient.email })}
            </DialogDescription>
          </DialogHeader>

          {!inviteResult ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("clients.inviteExplanation")}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteClient(null)}>{t("common.cancel")}</Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  <Mail className="mr-2 h-4 w-4" />
                  {inviting ? t("clients.creating") : t("clients.createInvite")}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium text-sm">{t("clients.inviteSuccess")}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("clients.inviteLinkDescription")}
              </p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-xs break-all">
                <span className="flex-1 font-mono">{inviteResult.link}</span>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setInviteClient(null); setInviteResult(null); }}>
                  {t("common.close")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
