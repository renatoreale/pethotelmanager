import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Users, CheckCircle2, Clock } from "lucide-react";

export function DemoLeadsTab() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ["demo-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const confirmedCount = leads?.filter(l => l.confirmed).length ?? 0;
  const totalCount = leads?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Richieste totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{confirmedCount}</p>
                <p className="text-sm text-muted-foreground">Confermate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{totalCount - confirmedCount}</p>
                <p className="text-sm text-muted-foreground">In attesa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Richieste Demo</CardTitle>
          <CardDescription>Elenco di tutti gli utenti che hanno richiesto la demo gratuita</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !leads?.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessuna richiesta demo</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cognome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data richiesta</TableHead>
                    <TableHead>Confermata il</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.full_name}</TableCell>
                      <TableCell>{(lead as any).last_name || "-"}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{(lead as any).phone || "-"}</TableCell>
                      <TableCell>
                        {lead.confirmed ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Confermata
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
                        {(lead as any).confirmed_at
                          ? format(new Date((lead as any).confirmed_at), "dd MMM yyyy HH:mm", { locale: it })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
