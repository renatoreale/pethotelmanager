import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAttentionItems, type NotificationSeverity } from "@/hooks/useAttentionItems";

const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  critico: "bg-red-500",
  attenzione: "bg-orange-500",
  informazione: "bg-blue-500",
};
const SEVERITY_LABEL: Record<NotificationSeverity, string> = {
  critico: "Critico",
  attenzione: "Attenzione",
  informazione: "Informazione",
};

// Centro notifiche (Blocco 25): campanella in header, sempre raggiungibile,
// con lo stesso tipo di segnalazioni già presenti nella dashboard "Oggi in
// pensione" (documenti mancanti, pagamenti aperti, farmaci imminenti,
// check-in imminenti) calcolate però in modo indipendente (vedi
// useAttentionItems) così da non dipendere dalla pagina Dashboard.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { items, isLoading } = useAttentionItems();

  const criticalCount = items.filter((i) => i.severity === "critico").length;
  const badgeCount = items.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0" title="Notifiche">
          <Bell className="h-4 w-4" />
          {badgeCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white",
              criticalCount > 0 ? "bg-red-500" : "bg-orange-500"
            )}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notifiche</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Avvisi urgenti di oggi. Per la giornata selezionata sulla Dashboard, vedi la card "Richiede la tua attenzione".
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Caricamento...</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Nessuna notifica al momento 🎉</p>
          ) : (
            items.map((item) => (
              <button
                key={item.key}
                onClick={() => { setOpen(false); navigate(item.href); }}
                className="flex items-start gap-2.5 w-full px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-b-0"
              >
                <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", SEVERITY_DOT[item.severity])} title={SEVERITY_LABEL[item.severity]} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
