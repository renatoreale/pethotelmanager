import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, User, Cat, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface ClientHit {
  type: "client";
  id: string;
  label: string;
  detail: string;
}
interface CatHit {
  type: "cat";
  id: string;
  label: string;
  detail: string;
}
interface BookingHit {
  type: "booking";
  id: string;
  label: string;
  detail: string;
  bookingNumber: string;
}
type Hit = ClientHit | CatHit | BookingHit;

// Ricerca globale su clienti (nome, telefono, email), pet (nome, microchip)
// e prenotazioni (numero), raggiungibile da ogni pagina dell'header. La
// query gira solo quando l'utente digita almeno 2 caratteri, per non
// interrogare il database ad ogni lettera inutilmente.
function useGlobalSearch(query: string) {
  const supabase = useSupabase();
  const { profile } = useAuth();
  const enabled = !!profile?.tenant_id && query.trim().length >= 2;

  return useQuery({
    queryKey: ["global-search", profile?.tenant_id, query],
    queryFn: async (): Promise<Hit[]> => {
      const tenantId = profile!.tenant_id;
      const q = query.trim();
      const pattern = `%${q}%`;

      const [clientsRes, catsRes, bookingsRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, first_name, last_name, phone, email")
          .eq("tenant_id", tenantId)
          .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("cats")
          .select("id, name, microchip, client:clients(first_name, last_name)")
          .eq("tenant_id", tenantId)
          .or(`name.ilike.${pattern},microchip.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("bookings")
          .select("id, booking_number, check_in_date, check_out_date")
          .eq("tenant_id", tenantId)
          .ilike("booking_number", pattern)
          .limit(5),
      ]);

      const hits: Hit[] = [];
      for (const c of clientsRes.data ?? []) {
        hits.push({
          type: "client", id: c.id,
          label: `${c.first_name} ${c.last_name}`,
          detail: [c.phone, c.email].filter(Boolean).join(" · "),
        });
      }
      for (const c of (catsRes.data ?? []) as any[]) {
        const owner = c.client ? `${c.client.first_name} ${c.client.last_name}` : "";
        hits.push({
          type: "cat", id: c.id,
          label: c.name,
          detail: [owner, c.microchip ? `chip ${c.microchip}` : null].filter(Boolean).join(" · "),
        });
      }
      for (const b of bookingsRes.data ?? []) {
        hits.push({
          type: "booking", id: b.id,
          label: b.booking_number,
          bookingNumber: b.booking_number,
          detail: `${b.check_in_date} → ${b.check_out_date}`,
        } as BookingHit);
      }
      return hits;
    },
    enabled,
    staleTime: 15_000,
  });
}

const TYPE_ICON: Record<Hit["type"], typeof User> = {
  client: User, cat: Cat, booking: CalendarDays,
};
const TYPE_LABEL: Record<Hit["type"], string> = {
  client: "Cliente", cat: "Pet", booking: "Prenotazione",
};

export function GlobalSearch() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: hits } = useGlobalSearch(value);

  const results = useMemo(() => (hits ?? []).slice(0, 10), [hits]);

  useEffect(() => {
    setOpen(value.trim().length >= 2 && results.length > 0);
    setFocusIndex(-1);
  }, [value, results.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goTo = (hit: Hit) => {
    setOpen(false);
    setValue("");
    if (hit.type === "cat") {
      navigate(`/gatti/${hit.id}`);
    } else if (hit.type === "client") {
      navigate(`/clienti?q=${encodeURIComponent(hit.label)}`);
    } else {
      navigate(`/prenotazioni?q=${encodeURIComponent(hit.bookingNumber)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && focusIndex >= 0) { e.preventDefault(); goTo(results[focusIndex]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => { if (results.length > 0 && value.trim().length >= 2) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder="Cerca cliente, animale, telefono o prenotazione..."
        className="pl-10 h-9"
      />
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden max-h-80 overflow-y-auto">
          {results.map((hit, i) => {
            const Icon = TYPE_ICON[hit.type];
            return (
              <button
                key={`${hit.type}-${hit.id}`}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                  i === focusIndex && "bg-accent"
                )}
                onMouseDown={(e) => { e.preventDefault(); goTo(hit); }}
                onMouseEnter={() => setFocusIndex(i)}
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{hit.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{TYPE_LABEL[hit.type]}</span>
                  </div>
                  {hit.detail && <div className="text-xs text-muted-foreground truncate">{hit.detail}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
