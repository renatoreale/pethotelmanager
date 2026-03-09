import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ClipboardList, Cat, Dog, PawPrint } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useCatRegistry } from "@/hooks/useCatRegistry";
import { usePetLabels } from "@/hooks/usePetLabels";

export default function RegistroGatti() {
  const { data: entries, isLoading } = useCatRegistry();
  const pet = usePetLabels();
  const PetIcon = pet.iconName === "Cat" ? Cat : pet.iconName === "Dog" ? Dog : PawPrint;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tutti" | "presenti" | "usciti">("tutti");

  const filtered = useMemo(() => {
    if (!entries) return [];
    let list = [...entries];

    if (statusFilter === "presenti") {
      list = list.filter(e => !e.check_out_date);
    } else if (statusFilter === "usciti") {
      list = list.filter(e => !!e.check_out_date);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.cat_name?.toLowerCase().includes(q) ||
        e.client_name?.toLowerCase().includes(q) ||
        e.microchip?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [entries, search, statusFilter]);

  const presenti = (entries ?? []).filter(e => !e.check_out_date).length;
  const totale = (entries ?? []).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registro {pet.pluralCap}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registro degli ingressi e delle uscite {pet.ofPlural} dalla struttura.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Presenti ora</div>
          <div className="text-2xl font-bold font-mono mt-1 text-primary">{presenti}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Usciti</div>
          <div className="text-2xl font-bold font-mono mt-1">{totale - presenti}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Totale registrati</div>
          <div className="text-2xl font-bold font-mono mt-1">{totale}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca gatto, cliente o microchip..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti</SelectItem>
            <SelectItem value="presenti">Presenti</SelectItem>
            <SelectItem value="usciti">Usciti</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : !filtered.length ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <Cat className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nessun gatto nel registro</p>
          <p className="text-sm mt-1">I gatti verranno aggiunti automaticamente al check-in.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
             <TableRow>
                <TableHead>Gatto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Microchip</TableHead>
                <TableHead>Razza</TableHead>
                <TableHead>Sesso</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Motivo uscita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Cat className="h-4 w-4 text-muted-foreground" />
                      {entry.cat_name}
                    </div>
                  </TableCell>
                  <TableCell>{entry.client_name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.microchip ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.cats?.breed ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.cats?.gender ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {format(parseISO(entry.check_in_date), "dd MMM yyyy", { locale: it })}
                  </TableCell>
                  <TableCell>
                    {entry.check_out_date
                      ? format(parseISO(entry.check_out_date), "dd MMM yyyy", { locale: it })
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {entry.check_out_date ? (
                      <Badge variant="secondary" className="text-[10px]">Uscito</Badge>
                    ) : (
                      <Badge className="text-[10px]">Presente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.reason ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
