import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useSendAssistantMessage,
  type AssistantMessage,
  type AssistantTaskProposal,
} from "@/hooks/useAiAssistant";
import { useCreateTask } from "@/hooks/usePlanningTasks";
import type { TaskCategory, TaskPriority } from "@/lib/taskCategories";

// Assistente virtuale (Blocco 26): pulsante flottante sempre raggiungibile,
// gated dal flag ai_assistant_enabled del tenant. La cronologia vive solo in
// questo componente (nessuna persistenza lato server per ora). Le proposte di
// azione (es. creare un'attività) NON vengono mai eseguite dall'edge
// function: la conferma qui passa dalla normale mutation useCreateTask, già
// protetta da RLS come qualunque altra creazione di task nell'app.
export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [pendingProposal, setPendingProposal] = useState<AssistantTaskProposal | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = useSendAssistantMessage();
  const createTask = useCreateTask();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMessage.isPending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMessage.isPending) return;
    const nextMessages: AssistantMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setPendingProposal(null);
    try {
      const res = await sendMessage.mutateAsync(nextMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.proposal) setPendingProposal(res.proposal);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Errore: ${err.message || "qualcosa è andato storto"}` }]);
    }
  };

  const confirmProposal = async () => {
    if (!pendingProposal) return;
    const p = pendingProposal.params;
    try {
      await createTask.mutateAsync({
        title: p.title,
        description: p.description,
        task_date: p.task_date,
        scheduled_time: p.scheduled_time,
        category: p.category as TaskCategory | undefined,
        priority: p.priority as TaskPriority | undefined,
      });
      toast.success("Attività creata");
      setPendingProposal(null);
    } catch (err: any) {
      toast.error(err.message || "Errore nella creazione dell'attività");
    }
  };

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg p-0"
        onClick={() => setOpen(true)}
        title="Assistente"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Assistente
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4" ref={scrollRef}>
            <div className="py-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Chiedimi informazioni su clienti, prenotazioni, pagamenti o sulla giornata di oggi. Posso anche proporre attività di planning, che dovrai confermare tu.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap",
                    m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {m.content}
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="bg-muted rounded-lg px-3 py-2 text-sm w-fit flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sto pensando...
                </div>
              )}
              {pendingProposal && (
                <Card className="border-primary/40">
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Proposta: nuova attività</p>
                    <p className="text-sm font-medium">{pendingProposal.params.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {pendingProposal.params.task_date}
                      {pendingProposal.params.scheduled_time ? ` · ${pendingProposal.params.scheduled_time}` : ""}
                    </p>
                    {pendingProposal.params.description && (
                      <p className="text-xs text-muted-foreground">{pendingProposal.params.description}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={confirmProposal} disabled={createTask.isPending} className="gap-1">
                        <Check className="h-3.5 w-3.5" /> Conferma
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPendingProposal(null)} className="gap-1">
                        <X className="h-3.5 w-3.5" /> Ignora
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="border-t p-3 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Scrivi un messaggio..."
              className="min-h-[40px] max-h-32 resize-none"
              rows={1}
            />
            <Button size="icon" onClick={handleSend} disabled={sendMessage.isPending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
