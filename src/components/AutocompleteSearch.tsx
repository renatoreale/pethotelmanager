import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Cat, Mail, Phone, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";

export interface SearchableItem {
  label: string;
  value: string;
  type: "cliente" | "gatto" | "email" | "telefono" | "prenotazione";
}

interface AutocompleteSearchProps {
  items: SearchableItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const TYPE_ICONS = {
  cliente: User,
  gatto: Cat,
  email: Mail,
  telefono: Phone,
  prenotazione: Hash,
};

const TYPE_LABELS: Record<string, string> = {
  cliente: "Cliente",
  gatto: "Gatto",
  email: "Email",
  telefono: "Telefono",
  prenotazione: "Prenotazione",
};

export function AutocompleteSearch({ items, value, onChange, placeholder, className }: AutocompleteSearchProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!value.trim() || value.trim().length < 2) return [];
    const q = value.toLowerCase();
    // Deduplicate by value+type
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.type}:${item.value}`;
      if (seen.has(key)) return false;
      if (!item.value.toLowerCase().includes(q)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [items, value]);

  useEffect(() => {
    setOpen(suggestions.length > 0 && value.trim().length >= 2);
    setFocusIndex(-1);
  }, [suggestions, value]);

  // Close on click outside
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
      onChange(suggestions[focusIndex].value);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const selectSuggestion = (item: SearchableItem) => {
    onChange(item.value);
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
          {suggestions.map((item, i) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <button
                key={`${item.type}:${item.value}:${i}`}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                  i === focusIndex && "bg-accent"
                )}
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(item); }}
                onMouseEnter={() => setFocusIndex(i)}
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">
                  <HighlightMatch text={item.label} query={value} />
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{TYPE_LABELS[item.type]}</span>
              </button>
            );
          })}
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
