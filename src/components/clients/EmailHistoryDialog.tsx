import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, FileText, CalendarClock, KeyRound, UserPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useClientEmailLogs, type EmailLog } from "@/hooks/useEmailLogs";
import { useState } from "react";

const EMAIL_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  preventivo: { label: "Preventivo", icon: <FileText className="h-3.5 w-3.5" /> },
  appuntamento: { label: "Appuntamenti", icon: <CalendarClock className="h-3.5 w-3.5" /> },
  invito: { label: "Invito portale", icon: <UserPlus className="h-3.5 w-3.5" /> },
  reset_password: { label: "Reset password", icon: <KeyRound className="h-3.5 w-3.5" /> },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function EmailHistoryDialog({ open, onOpenChange, clientId, clientName }: Props) {
  const { data: logs, isLoading } = useClientEmailLogs(open ? clientId : undefined);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  const handleOpenChange = (val: boolean) => {
    if (!val) setSelectedLog(null);
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedLog ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 mr-1"
                onClick={() => setSelectedLog(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Mail className="h-5 w-5" />
            )}
            {selectedLog ? selectedLog.subject ?? "Email" : `Email — ${clientName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {selectedLog ? (
            /* ── PREVIEW ── */
            <div className="flex flex-col gap-3">
              <div className="text-xs text-muted-foreground space-y-0.5 border-b pb-3">
                <p><span className="font-medium">A:</span> {selectedLog.recipient_email}</p>
                <p><span className="font-medium">Data:</span> {format(parseISO(selectedLog.sent_at), "dd MMM yyyy HH:mm", { locale: it })}</p>
              </div>
              {selectedLog.body_html ? (
                <iframe
                  srcDoc={selectedLog.body_html}
                  className="w-full border-0 rounded"
                  style={{ height: "420px" }}
                  sandbox="allow-same-origin"
                  title="Anteprima email"
                />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Contenuto non disponibile per le email inviate prima di questo aggiornamento.
                </p>
              )}
            </div>
          ) : (
            /* ── LIST ── */
            <>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Caricamento...</div>
              ) : !logs?.length ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Nessuna email registrata per questo cliente.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data e ora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Oggetto</TableHead>
                      <TableHead>A</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const typeInfo = EMAIL_TYPE_LABELS[log.email_type] ?? { label: log.email_type, icon: <Mail className="h-3.5 w-3.5" /> };
                      return (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedLog(log)}
                        >
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(parseISO(log.sent_at), "dd MMM yyyy HH:mm", { locale: it })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              {typeInfo.icon}
                              {typeInfo.label}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                            {log.subject ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.recipient_email ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.status === "sent" ? "secondary" : "destructive"} className="text-xs">
                              {log.status === "sent" ? "Inviata" : log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
