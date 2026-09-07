import {
  UtensilsCrossed, Pill, Sparkles, LogIn, LogOut, Camera, Eye, FileText, CircleEllipsis,
} from "lucide-react";

export type TaskCategory =
  | "alimentazione" | "farmaco" | "pulizia" | "check_in" | "check_out"
  | "foto" | "controllo" | "amministrazione" | "altro";

export type TaskPriority = "bassa" | "media" | "alta" | "urgente";

export const TASK_CATEGORIES: { value: TaskCategory; label: string; icon: any }[] = [
  { value: "alimentazione", label: "Alimentazione", icon: UtensilsCrossed },
  { value: "farmaco", label: "Farmaco", icon: Pill },
  { value: "pulizia", label: "Pulizia", icon: Sparkles },
  { value: "check_in", label: "Check-in", icon: LogIn },
  { value: "check_out", label: "Check-out", icon: LogOut },
  { value: "foto", label: "Foto", icon: Camera },
  { value: "controllo", label: "Controllo", icon: Eye },
  { value: "amministrazione", label: "Amministrazione", icon: FileText },
  { value: "altro", label: "Altro", icon: CircleEllipsis },
];

export const TASK_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  TASK_CATEGORIES.map((c) => [c.value, c.label])
);
export const TASK_CATEGORY_ICONS: Record<string, any> = Object.fromEntries(
  TASK_CATEGORIES.map((c) => [c.value, c.icon])
);

export const TASK_PRIORITIES: { value: TaskPriority; label: string; badgeClass: string }[] = [
  { value: "bassa", label: "Bassa", badgeClass: "bg-muted text-muted-foreground" },
  { value: "media", label: "Media", badgeClass: "bg-primary/15 text-primary" },
  { value: "alta", label: "Alta", badgeClass: "bg-warning/15 text-warning" },
  { value: "urgente", label: "Urgente", badgeClass: "bg-destructive/15 text-destructive" },
];

export const TASK_PRIORITY_LABELS: Record<string, string> = Object.fromEntries(
  TASK_PRIORITIES.map((p) => [p.value, p.label])
);
export const TASK_PRIORITY_BADGE: Record<string, string> = Object.fromEntries(
  TASK_PRIORITIES.map((p) => [p.value, p.badgeClass])
);
export const TASK_PRIORITY_RANK: Record<string, number> = {
  urgente: 0, alta: 1, media: 2, bassa: 3,
};
