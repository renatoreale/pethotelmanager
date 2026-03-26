import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, MessageCircle, ArrowLeft, Send, Clock } from "lucide-react";
import {
  useMyTickets, useCreateTicket, useTicketMessages, useReplyTicket, useUpdateTicketStatus,
  markTicketViewed, hasNewActivity,
  type SupportTicket, type TicketCategory, type TicketPriority, type TicketStatus,
} from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  tecnico: "Tecnico",
  fatturazione: "Fatturazione",
  configurazione: "Configurazione",
  altro: "Altro",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  bassa: "Bassa",
  normale: "Normale",
  alta: "Alta",
  urgente: "Urgente",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  aperto: "Aperto",
  in_lavorazione: "In lavorazione",
  risolto: "Risolto",
  chiuso: "Chiuso",
};

const STATUS_VARIANT: Record<TicketStatus, "default" | "secondary" | "outline" | "destructive"> = {
  aperto: "default",
  in_lavorazione: "secondary",
  risolto: "outline",
  chiuso: "outline",
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  bassa: "text-muted-foreground",
  normale: "text-blue-600",
  alta: "text-orange-500",
  urgente: "text-destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── New Ticket Dialog ────────────────────────────────────────────────────────

function NewTicketDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createTicket = useCreateTicket();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TicketCategory>("tecnico");
  const [priority, setPriority] = useState<TicketPriority>("normale");
  const [body, setBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { toast.error("Titolo e descrizione obbligatori"); return; }
    try {
      const ticket = await createTicket.mutateAsync({ title: title.trim(), category, priority, body: body.trim() });
      if (ticket) markTicketViewed((ticket as any).id, (ticket as any).updated_at);
      toast.success("Ticket creato con successo");
      setTitle(""); setBody(""); setCategory("tecnico"); setPriority("normale");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore nella creazione del ticket");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo Ticket di Supporto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Titolo *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descrivi brevemente il problema" maxLength={150} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priorità</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrizione *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Descrivi il problema in dettaglio..."
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? "Invio..." : "Invia Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Ticket Thread ────────────────────────────────────────────────────────────

function TicketThread({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
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
      await reply.mutateAsync({ ticketId: ticket.id, body: body.trim(), isSupportReply: false });
      setBody("");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'invio");
    }
  };

  const handleClose = async () => {
    try {
      await updateStatus.mutateAsync({ ticketId: ticket.id, status: "chiuso" });
      toast.success("Ticket chiuso");
      onBack();
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
              <div className="flex flex-wrap gap-2">
                <Badge variant={STATUS_VARIANT[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
                <Badge variant="outline">{CATEGORY_LABELS[ticket.category]}</Badge>
                <span className={`text-xs font-medium ${PRIORITY_COLOR[ticket.priority]}`}>
                  Priorità: {PRIORITY_LABELS[ticket.priority]}
                </span>
              </div>
            </div>
            {!isClosed && (
              <Button variant="outline" size="sm" onClick={handleClose}>Chiudi ticket</Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" /> Aperto il {formatDate(ticket.created_at)}
          </p>
        </CardHeader>
      </Card>

      {/* Messages */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Caricamento...</div>
        ) : messages?.map((msg) => {
          const isOwn = msg.author_id === user?.id && !msg.is_support_reply;
          return (
            <div key={msg.id} className={`flex ${msg.is_support_reply ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm space-y-1 ${
                msg.is_support_reply
                  ? "bg-muted border"
                  : "bg-primary text-primary-foreground"
              }`}>
                <p className={`text-xs font-medium ${msg.is_support_reply ? "text-muted-foreground" : "text-primary-foreground/80"}`}>
                  {msg.is_support_reply ? "Supporto Pet Hotel Manager" : msg.author_name}
                </p>
                <p className="whitespace-pre-wrap">{msg.body}</p>
                <p className={`text-xs ${msg.is_support_reply ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                  {formatDate(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply form */}
      {!isClosed && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleReply} className="space-y-3">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Scrivi un messaggio..."
                rows={3}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={reply.isPending || !body.trim()} className="gap-2">
                  <Send className="h-4 w-4" /> Invia
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {isClosed && (
        <p className="text-center text-sm text-muted-foreground py-2">
          Questo ticket è {STATUS_LABELS[ticket.status].toLowerCase()}. Non è possibile aggiungere nuovi messaggi.
        </p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Supporto() {
  const { data: tickets, isLoading } = useMyTickets();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  if (selected) {
    return <TicketThread ticket={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Supporto</h1>
          <p className="text-muted-foreground text-sm mt-1">Apri un ticket per ricevere assistenza dal team Pet Hotel Manager</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuovo Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : !tickets?.length ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Nessun ticket aperto. Crea il tuo primo ticket per ricevere supporto.</p>
            <Button onClick={() => setNewOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Apri un ticket
            </Button>
          </CardContent>
        </Card>
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
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={STATUS_VARIANT[ticket.status]} className="text-xs">{STATUS_LABELS[ticket.status]}</Badge>
                      <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[ticket.category]}</Badge>
                      <span className={`text-xs font-medium ${PRIORITY_COLOR[ticket.priority]}`}>
                        {PRIORITY_LABELS[ticket.priority]}
                      </span>
                    </div>
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

      <NewTicketDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
