import { Checkbox } from "@/components/ui/checkbox";
import type { ChecklistItem } from "@/lib/checklists";

interface ChecklistPreviewProps {
  title: string;
  items: ChecklistItem[];
}

// Anteprima informativa: le voci non sono ancora task reali (vengono create
// solo alla conferma del check-in/check-out), quindi sono mostrate come
// checkbox disabilitate — solo per far vedere in anticipo cosa verrà generato.
export function ChecklistPreview({ title, items }: ChecklistPreviewProps) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-2 text-sm">
            <Checkbox checked={false} disabled className="mt-0.5" />
            <div>
              <p>{item.title}</p>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Diventeranno task completabili in "Attività" dopo la conferma.
      </p>
    </div>
  );
}
