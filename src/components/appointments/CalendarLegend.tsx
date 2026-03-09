import { LogIn, LogOut, CheckCircle2 } from "lucide-react";

const items = [
  { label: "Check-in da fare", icon: LogIn, bg: "bg-[hsl(var(--checkin-pending))]", text: "text-[hsl(var(--checkin-pending-foreground))]" },
  { label: "Check-in effettuato", icon: LogIn, bg: "bg-[hsl(var(--checkin-done))]", text: "text-[hsl(var(--checkin-done-foreground))]" },
  { label: "Check-out", icon: LogOut, bg: "bg-[hsl(var(--checkout-pending))]", text: "text-[hsl(var(--checkout-pending-foreground))]" },
  { label: "Confermato", icon: CheckCircle2, bg: "", text: "text-[hsl(var(--confirmed-ring))]", ring: true },
];

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 ${item.bg} ${item.text} ${item.ring ? "ring-1 ring-[hsl(var(--confirmed-ring)/0.4)]" : ""}`}>
            <item.icon className="h-3 w-3" />
          </span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
