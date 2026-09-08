import { useState } from "react";
import {
  useBusinessOverview, BUSINESS_PERIODS, type BusinessPeriod, type BusinessMetrics,
} from "@/hooks/useBusinessOverview";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoTooltip } from "@/components/InfoTooltip";
import {
  Euro, CalendarCheck, Grid3X3, Clock, TrendingUp, TrendingDown, Minus, Sparkles, UserPlus, Repeat, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatEuro(value: number) {
  return `€ ${value.toLocaleString("it-IT", { maximumFractionDigits: 0 })}`;
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    if (current === 0) return null;
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
        <TrendingUp className="h-3 w-3" /> nuovo
      </span>
    );
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  const isUp = pct > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium",
      isUp ? "text-emerald-600" : "text-red-500"
    )}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function KpiTile({
  icon: Icon, label, description, current, previous, format,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  current: number;
  previous: number;
  format: (v: number) => string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <InfoTooltip text={description} />
        </div>
        <p className="text-xl font-bold text-foreground">{format(current)}</p>
        <Delta current={current} previous={previous} />
      </CardContent>
    </Card>
  );
}

export function BusinessOverview() {
  const [period, setPeriod] = useState<BusinessPeriod>("30d");
  const { current, previous, openBalance, hasCapacityConfigured, isLoading } = useBusinessOverview(period);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Indicatori di business per il periodo selezionato, a confronto con il periodo precedente.
        </p>
        <Select value={period} onValueChange={(v) => setPeriod(v as BusinessPeriod)}>
          <SelectTrigger className="w-[140px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading || !current || !previous ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiTile
              icon={Euro} label="Fatturato"
              description="Incassi netti nel periodo selezionato (pagamenti ricevuti, meno eventuali rimborsi), a confronto con il periodo precedente di pari durata."
              current={current.revenue} previous={previous.revenue} format={formatEuro}
            />
            <KpiTile
              icon={CalendarCheck} label="Prenotazioni"
              description="Prenotazioni confermate create nel periodo selezionato (esclusi preventivi non confermati, cancellazioni e rimborsi)."
              current={current.bookingsCount} previous={previous.bookingsCount} format={(v) => v.toString()}
            />
            <KpiTile
              icon={Grid3X3} label="Occupazione"
              description="Stima della percentuale di posti occupati nel periodo, calcolata sulla capacità totale configurata (casette singole + doppie). È una stima aggregata: per il dettaglio giorno per giorno usa Occupazione Casette."
              current={current.occupancyPct} previous={previous.occupancyPct}
              format={(v) => hasCapacityConfigured ? `${v.toFixed(0)}%` : "N/D"}
            />
            <KpiTile
              icon={Clock} label="Durata media soggiorno"
              description="Numero medio di notti dei soggiorni con check-out avvenuto nel periodo selezionato."
              current={current.avgStayDays} previous={previous.avgStayDays} format={(v) => `${v.toFixed(1)} gg`}
            />
            <KpiTile
              icon={Sparkles} label="Valore medio soggiorno"
              description="Importo medio (totale prenotazione) dei soggiorni con check-out avvenuto nel periodo selezionato."
              current={current.avgStayValue} previous={previous.avgStayValue} format={formatEuro}
            />
            <KpiTile
              icon={Euro} label="Extra"
              description="Incassi da pagamenti di tipo 'extra' registrati nel periodo selezionato (es. servizi aggiuntivi, giorni extra)."
              current={current.extraRevenue} previous={previous.extraRevenue} format={formatEuro}
            />
            <KpiTile
              icon={UserPlus} label="Clienti nuovi"
              description="Clienti che hanno effettuato in questo periodo la loro prima prenotazione in assoluto presso la pensione."
              current={current.newClients} previous={previous.newClients} format={(v) => v.toString()}
            />
            <KpiTile
              icon={Repeat} label="Clienti ricorrenti"
              description="Clienti che hanno prenotato in questo periodo e avevano già almeno una prenotazione precedente."
              current={current.returningClients} previous={previous.returningClients} format={(v) => v.toString()}
            />
          </div>

          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Wallet className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground">Pagamenti aperti (saldo attuale, tutti i soggiorni attivi)</p>
                  <InfoTooltip text="Saldo ancora da incassare su tutte le prenotazioni attive, a prescindere dal periodo selezionato: è la situazione attuale, non una metrica storica." />
                </div>
                <p className="text-lg font-bold text-amber-600">{formatEuro(openBalance ?? 0)}</p>
              </div>
            </CardContent>
          </Card>

          {!hasCapacityConfigured && (
            <p className="text-xs text-muted-foreground">
              Configura il numero di casette in Impostazioni Pensione per vedere la percentuale di occupazione.
            </p>
          )}
        </>
      )}
    </div>
  );
}
