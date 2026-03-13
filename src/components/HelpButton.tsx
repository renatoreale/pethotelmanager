import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface HelpStep {
  title: string;
  description: string;
  tip?: string;
}

export interface HelpSection {
  title: string;
  description?: string;
  steps: HelpStep[];
}

interface HelpButtonProps {
  pageTitle: string;
  pageDescription: string;
  sections: HelpSection[];
}

export function HelpButton({ pageTitle, pageDescription, sections }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-8 w-8 shrink-0"
        onClick={() => setOpen(true)}
        title="Guida"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <SheetTitle className="text-lg">{pageTitle}</SheetTitle>
            </div>
            <SheetDescription className="text-sm">
              {pageDescription}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="px-6 py-4 space-y-6">
              {sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      {section.title}
                    </h3>
                    {section.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {section.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {section.steps.map((step, stepIdx) => (
                      <div
                        key={stepIdx}
                        className="flex gap-3 p-3 rounded-lg bg-muted/40 border border-border/50"
                      >
                        <Badge
                          variant="secondary"
                          className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center p-0 text-xs font-bold"
                        >
                          {stepIdx + 1}
                        </Badge>
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                          {step.tip && (
                            <p className="text-xs text-primary italic mt-1">
                              💡 {step.tip}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {sIdx < sections.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
