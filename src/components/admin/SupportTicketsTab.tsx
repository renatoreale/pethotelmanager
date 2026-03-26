import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send, Clock, Building2 } from "lucide-react";
import {
  useAllTickets, useTicketMessages, useReplyTicket, useUpdateTicketStatus,
  markTicketViewed, hasNewActivity,
  type SupportTicket, type TicketStatus,
} from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";

const CATEGORY_LABELS: Record<string, string> = {
  tecnico: "Tecnico", fatturazione: "Fatturazione", configurazione: "Configurazione", altro: "Altro",
};
const PRIORITY_LABELS: Record<string, string> = {
  bassa: "Bassa", normale: "Normale", alta: "Alta", urgente: "Urgente",
};
const STATUS_LABELS: Record<string, string> = {
  aperto: "Aperto", in_lavorazione: "In lavorazione", risolto: "Risolto", chiuso: "Chiuso",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  aperto: "default", in_lavorazione: "secondary", risolto: "outline", chiuso: "outline",
};
const PRIORITY_COLOR: Record<string, string> = {
  bassa: "text-muted-foreground", normale: "text-blue-600", alta: "text-orange-500", urgente: "text-destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Ticket Thread (admin) ─────────────────────────────────────────────────────

function AdminTicketThread({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useTicketMessages(ticket.id);
  const reply = useReplyTicket();
  const updateStatus = useUpdateTicketStatus();
  const [body, setBody] = useState("");

  useEffect(() => { markTicketViewed(ticket.id, ticket.updated_at); }, [ticket.id, ticket.updated_at]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await reply.mutateAsync({ ticketId: ticket.id, body: body.trim(), isSupportReply: true });
      setBody("");
      toast.success("Risposta inviata");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'invio");
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    try {
      await updateStatus.mutateAsync({ ticketId: ticket.id, status });
      toast.success(`Stato aggiornato: ${STATUS_LABELS[status]}`);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const isClosed = ticket.status === "chiuso" || ticket.status === "risolto";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Tutti i ticket
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <CardTitle className="text-base">{ticket.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
                <Badge variant="outline">{CATEGORY_LABELS[ticket.category]}</Badge>
                <span className={`text-xs font-medium ${PRIORITY_COLOR[ticket.priority]}`}>
                  Priorità: {PRIORITY_LABELS[ticket.priority]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {ticket.tenant_name} · {ticket.creator_name}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Aperto il {formatDate(ticket.created_at)}
              </p>
            </div>
            {/* Status changer */}
            <div className="flex items-center gap-2">
              <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as TicketStatus)}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Caricamento...</div>
        ) : messages?.map((msg) => (
          <div key={msg.id} className={`flex ${msg.is_support_reply ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm space-y-1 ${
              msg.is_support_reply
                ? "bg-primary text-primary-foreground"
                : "bg-muted border"
            }`}>
              <p className={`text-xs font-medium ${msg.is_support_reply ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {msg.is_support_reply ? "Supporto Pet Hotel Manager" : msg.author_name}
              </p>
              <p className="whitespace-pre-wrap">{msg.body}</p>
              <p className={`text-xs ${msg.is_support_reply ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {formatDate(msg.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply form */}
      {!isClosed && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleReply} className="space-y-3">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Scrivi una risposta al cliente..."
                rows={4}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={reply.isPending || !body.trim()} className="gap-2">
                  <Send className="h-4 w-4" /> Rispondi al cliente
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function SupportTicketsTab() {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "tutti">("tutti");
  const { data: tickets, isLoading } = useAllTickets(statusFilter);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  // If a ticket was updated (e.g. status changed), refresh the selected ticket from list
  const selectedTicket = selected
    ? (tickets?.find((t) => t.id === selected.id) ?? selected)
    : null;

  if (selectedTicket) {
    return <AdminTicketThread ticket={selectedTicket} onBack={() => setSelected(null)} />;
  }

  const counts = tickets?.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["aperto", "in_lavorazione", "risolto", "chiuso"] as TicketStatus[]).map((s) => (
          <Card key={s} className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter(s === statusFilter ? "tutti" : s)}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</p>
              <p className="text-2xl font-bold">{counts?.[s] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i ticket</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{tickets?.length ?? 0} ticket</p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : !tickets?.length ? (
        <div className="py-12 text-center text-muted-foreground">Nessun ticket trovato</div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelected(ticket)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{ticket.title}</p>
                      {hasNewActivity(ticket) && (
                        <span className="shrink-0 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          Nuovo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={STATUS_VARIANT[ticket.status]} className="text-xs">{STATUS_LABELS[ticket.status]}</Badge>
                      <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[ticket.category]}</Badge>
                      <span className={`text-xs font-medium ${PRIORITY_COLOR[ticket.priority]}`}>{PRIORITY_LABELS[ticket.priority]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {ticket.tenant_name} · {ticket.creator_name}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDate(ticket.updated_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
