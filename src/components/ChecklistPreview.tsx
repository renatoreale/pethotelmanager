import { Checkbox } from "@/components/ui/checkbox";
import type { ChecklistItem } from "@/lib/checklists";

interface ChecklistPreviewProps {
  title: string;
  items: ChecklistItem[];
  checked: Set<string>;
  onToggle: (title: string) => void;
}

// Le voci non sono ancora task reali (vengono create solo alla conferma del
// check-in/check-out): spuntarle qui decide con quale stato verranno
// generate — già completate se spuntate, da fare altrimenti. Restano comunque
// modificabili in seguito da "Attività".
export function ChecklistPreview({ title, items, checked, onToggle }: ChecklistPreviewProps) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={checked.has(item.title)}
              onCheckedChange={() => onToggle(item.title)}
              className="mt-0.5"
            />
            <div>
              <p>{item.title}</p>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Diventeranno task in "Attività" — spuntate qui saranno già segnate come completate.
      </p>
    </div>
  );
}
