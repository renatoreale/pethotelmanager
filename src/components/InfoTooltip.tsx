import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Icona "i" con tooltip esplicativo, riutilizzata ovunque servano brevi
// descrizioni di KPI/metriche (Panoramica business, Occupazione futura, ecc.)
// invece di duplicare lo stesso markup Tooltip in ogni componente.
export function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground/70 hover:text-foreground">
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
