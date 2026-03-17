import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Cat, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useAuth } from "@/hooks/useAuth";

const ACTIVE_STATUSES = [
  "confermata",
  "appuntamento_in_fissato",
  "appuntamento_out_fissato",
  "appuntamento_in_out_fissato",
  "check_in",
  "in_corso",
  "check_out",
];

interface GroupedSuggestion {
  clientName: string;
  email: string | null;
  phone: string | null;
  catNames: string[];
  /** The value we put in the search box when selected */
  searchValue: string;
}

function useActiveBookingSuggestions() {
  const supabase = useSupabase();
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["autocomplete-suggestions", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          booking_number,
          client:clients(id, first_name, last_name, email, phone),
          booking_cats(cat:cats(name))
        `)
        .eq("tenant_id", profile.tenant_id)
        .in("status", ACTIVE_STATUSES as any);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 30_000,
  });
}

interface AutocompleteSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AutocompleteSearch({ value, onChange, placeholder, className }: AutocompleteSearchProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: bookings } = useActiveBookingSuggestions();

  // Group by client
  const grouped = useMemo<GroupedSuggestion[]>(() => {
    if (!bookings) return [];
    const map = new Map<string, GroupedSuggestion>();
    for (const b of bookings) {
      const client = b.client as any;
      if (!client) continue;
      const clientId = client.id as string;
      if (!map.has(clientId)) {
        const name = `${client.first_name} ${client.last_name}`;
        map.set(clientId, {
          clientName: name,
          email: client.email ?? null,
          phone: client.phone ?? null,
          catNames: [],
          searchValue: name,
        });
      }
      const entry = map.get(clientId)!;
      for (const bc of (b.booking_cats ?? []) as any[]) {
        const catName = bc.cat?.name;
        if (catName && !entry.catNames.includes(catName)) {
          entry.catNames.push(catName);
        }
      }
    }
    return Array.from(map.values());
  }, [bookings]);

  const suggestions = useMemo(() => {
    if (!value.trim() || value.trim().length < 2) return [];
    const q = value.toLowerCase();
    return grouped.filter((g) => {
      return (
        g.clientName.toLowerCase().includes(q) ||
        g.catNames.some((c) => c.toLowerCase().includes(q)) ||
        (g.email && g.email.toLowerCase().includes(q)) ||
        (g.phone && g.phone.toLowerCase().includes(q))
      );
    }).slice(0, 8);
  }, [grouped, value]);

  useEffect(() => {
    setOpen(suggestions.length > 0 && value.trim().length >= 2);
    setFocusIndex(-1);
  }, [suggestions, value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && focusIndex >= 0) {
      e.preventDefault();
      onChange(suggestions[focusIndex].clientName);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const selectSuggestion = (item: GroupedSuggestion) => {
    onChange(item.clientName);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0 && value.trim().length >= 2) setOpen(true); }}
        onKeyDown={handleKeyDown}
        className="pl-10"
      />
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
          {suggestions.map((item, i) => (
            <button
              key={i}
              className={cn(
                "flex flex-col gap-0.5 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                i === focusIndex && "bg-accent"
              )}
              onMouseDown={(e) => { e.preventDefault(); selectSuggestion(item); }}
              onMouseEnter={() => setFocusIndex(i)}
            >
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">
                  <HighlightMatch text={item.clientName} query={value} />
                </span>
              </div>
              <div className="flex items-center gap-3 pl-5 text-xs text-muted-foreground flex-wrap">
                {item.catNames.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Cat className="h-3 w-3 shrink-0" />
                    {item.catNames.map((name, ci) => (
                      <span key={ci}>
                        <HighlightMatch text={name} query={value} />
                        {ci < item.catNames.length - 1 && ", "}
                      </span>
                    ))}
                  </span>
                )}
                {item.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    <HighlightMatch text={item.phone} query={value} />
                  </span>
                )}
                {item.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" />
                    <HighlightMatch text={item.email} query={value} />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-foreground">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
