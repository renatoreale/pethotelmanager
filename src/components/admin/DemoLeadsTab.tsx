import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as baseClient } from "@/integrations/supabase/client";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isPast, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { Users, CheckCircle2, CheckCircle, XCircle, Clock, Loader2, Copy, Video, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type LeadType = "all" | "demo_live" | "prova_gratuita";

interface DemoLead {
  id: string;
  full_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  confirmed: number | boolean;
  confirmed_at: string | null;
  token: string | null;
  lead_type: string;
  pensione_name: string | null;
  message: string | null;
  created_at: string;
}

interface TrialUser {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  trial_start: string | null;
  trial_end: string | null;
  is_converted: boolean;
}

export function DemoLeadsTab() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const [activationModal, setActivationModal] = useState<{ open: boolean; lead: (DemoLead & { activationLink?: string }) | null }>({ open: false, lead: null });
  const [activeTab, setActiveTab] = useState<LeadType>("all");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["demo-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_leads" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DemoLead[];
    },
  });

  const { data: trialUsers, isLoading: isLoadingTrials } = useQuery({
    queryKey: ["trial-registrations-admin"],
    enabled: !!session,
    queryFn: async () => {
      const authRes = await supabase.functions.invoke("admin-list-users");
      const userDetails: Record<string, any> = authRes.data?.userDetails || {};

      const result: TrialUser[] = [];
      for (const [userId, auth] of Object.entries(userDetails)) {
        const meta = (auth as any).user_metadata || {};
        const hasTrial = (auth as any).trial_start != null;
        if (!meta.is_trial && !hasTrial) continue;
        result.push({
          user_id: userId,
          email: (auth as any).email,
          full_name: meta.full_name || null,
          phone: meta.phone || null,
          trial_start: (auth as any).trial_start || null,
          trial_end: (auth as any).trial_end || null,
          is_converted: (auth as any).is_converted || false,
        });
      }
      result.sort((a, b) => (b.trial_start || "").localeCompare(a.trial_start || ""));
      return result;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("demo_leads" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Richiesta eliminata");
      queryClient.invalidateQueries({ queryKey: ["demo-leads"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Errore nell'eliminazione");
    },
  });

  const deleteTrialMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await baseClient.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Utenza eliminata");
      queryClient.invalidateQueries({ queryKey: ["trial-registrations-admin"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Errore nell'eliminazione");
    },
  });

  const handleCopyLink = () => {
    if (activationModal.lead?.activationLink) {
      navigator.clipboard.writeText(activationModal.lead.activationLink);
      toast.success("Link copiato negli appunti!");
    }
  };

  const isConfirmed = (lead: DemoLead) => lead.confirmed === 1 || lead.confirmed === true;

  const filteredLeads = leads?.filter((l) => {
    if (activeTab === "all") return true;
    return (l.lead_type || "prova_gratuita") === activeTab;
  });

  const demoLiveCount = leads?.filter((l) => l.lead_type === "demo_live").length ?? 0;
  const provaGratuitaCount = trialUsers?.length ?? 0;
  const pendingCount = leads?.filter((l) => !isConfirmed(l)).length ?? 0;

  const renderLeadTypeBadge = (lead: DemoLead) => {
    if (lead.lead_type === "demo_live") {
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <Video className="h-3 w-3 mr-1" /> Demo Live
        </Badge>
      );
    }
    return (
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
        <Play className="h-3 w-3 mr-1" /> Prova Gratuita
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{leads?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Richieste totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Video className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{demoLiveCount}</p>
                <p className="text-sm text-muted-foreground">Demo Live</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Play className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{provaGratuitaCount}</p>
                <p className="text-sm text-muted-foreground">Prova Gratuita</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">In attesa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Richieste Demo</CardTitle>
          <CardDescription>Gestione richieste demo live e prove gratuite</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeadType)} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">Tutte ({leads?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="demo_live">Demo Live ({demoLiveCount})</TabsTrigger>
              <TabsTrigger value="prova_gratuita">Prova Gratuita ({provaGratuitaCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "prova_gratuita" ? (
            isLoadingTrials ? (
              <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
            ) : !trialUsers?.length ? (
              <div className="py-12 text-center text-muted-foreground">Nessuna richiesta</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Richiesta il</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialUsers.map((u) => {
                      const expired = u.trial_end ? isPast(new Date(u.trial_end)) : false;
                      const daysLeft = u.trial_end && !expired
                        ? Math.max(0, differenceInDays(new Date(u.trial_end), new Date()))
                        : null;
                      return (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.phone || "—"}</TableCell>
                          <TableCell>
                            {u.trial_end ? (
                              expired ? (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" /> Scaduta
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
                                  <CheckCircle className="h-3 w-3" /> Attiva ({daysLeft}gg)
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" /> Richiesta
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {u.trial_start
                              ? format(new Date(u.trial_start), "dd MMM yyyy", { locale: it })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {u.trial_end
                              ? format(new Date(u.trial_end), "dd MMM yyyy", { locale: it })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteTrialMutation.mutate(u.user_id)}
                              disabled={deleteTrialMutation.isPending}
                              title="Elimina"
                            >
                              {deleteTrialMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
            ) : !filteredLeads?.length ? (
              <div className="py-12 text-center text-muted-foreground">Nessuna richiesta</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cognome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Pensione</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>{renderLeadTypeBadge(lead)}</TableCell>
                        <TableCell className="font-medium">{lead.full_name}</TableCell>
                        <TableCell>{lead.last_name || "-"}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.phone || "-"}</TableCell>
                        <TableCell>{lead.pensione_name || "-"}</TableCell>
                        <TableCell>
                          {isConfirmed(lead) ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Approvata
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" /> In attesa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(lead.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const baseUrl = window.location.origin;
                                const link = `${baseUrl}/confirm-demo?token=${lead.token}`;
                                setActivationModal({ open: true, lead: { ...lead, activationLink: link } });
                              }}
                            >
                              <Copy className="h-4 w-4 mr-1" /> Link
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(lead.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Activation Link Modal */}
      <Dialog open={activationModal.open} onOpenChange={(open) => setActivationModal({ open, lead: open ? activationModal.lead : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attiva Demo</DialogTitle>
          </DialogHeader>
          {activationModal.lead && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Invia questo link a <strong>{activationModal.lead.full_name} {activationModal.lead.last_name}</strong> ({activationModal.lead.email}) per permettergli di accedere alla demo:
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm font-medium text-green-700">Richiesta approvata!</span>
              </div>
              <div className="relative">
                <div className="rounded-md border bg-muted p-3 pr-10 text-xs break-all font-mono">
                  {activationModal.lead.activationLink}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setActivationModal({ open: false, lead: null })}>
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
