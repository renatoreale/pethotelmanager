import { useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay, isToday, parseISO, isSameMonth, getDay } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppointmentWithDetails } from "@/hooks/useAppointments";

interface CalendarGridProps {
  viewMode: "settimana" | "mese";
  selectedDate: Date;
  appointments: AppointmentWithDetails[];
  onSelectDate?: (date: Date) => void;
  onClickAppointment?: (appt: AppointmentWithDetails) => void;
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

export function CalendarGrid({ viewMode, selectedDate, appointments, onSelectDate, onClickAppointment }: CalendarGridProps) {
  if (viewMode === "settimana") {
    return <WeekGrid selectedDate={selectedDate} appointments={appointments} onSelectDate={onSelectDate} onClickAppointment={onClickAppointment} />;
  }
  return <MonthGrid selectedDate={selectedDate} appointments={appointments} onSelectDate={onSelectDate} onClickAppointment={onClickAppointment} />;
}

// ── WEEK GRID ──────────────────────────────────────────────

function WeekGrid({ selectedDate, appointments, onSelectDate, onClickAppointment }: Omit<CalendarGridProps, "viewMode">) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group appointments by date and time
  const apptsByDateHour = useMemo(() => {
    const map: Record<string, Record<number, AppointmentWithDetails[]>> = {};
    for (const a of appointments) {
      const dateStr = a.scheduled_at.slice(0, 10);
      const tIndex = a.scheduled_at.indexOf("T");
      const hour = tIndex >= 0 ? parseInt(a.scheduled_at.slice(tIndex + 1, tIndex + 3), 10) : 0;
      if (!map[dateStr]) map[dateStr] = {};
      if (!map[dateStr][hour]) map[dateStr][hour] = [];
      map[dateStr][hour].push(a);
    }
    return map;
  }, [appointments]);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header with day names and dates */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
        <div className="p-2 border-r text-xs text-muted-foreground" />
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              "p-2 text-center border-r last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors",
              isToday(day) && "bg-primary/5"
            )}
            onClick={() => onSelectDate?.(day)}
          >
            <div className="text-xs text-muted-foreground font-medium">{DAY_NAMES[i]}</div>
            <div className={cn(
              "text-lg font-semibold leading-tight mt-0.5",
              isToday(day) && "text-primary"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="border-r border-b p-1 text-xs text-muted-foreground text-right pr-2 h-16 flex items-start justify-end pt-0">
                <span className="-mt-2">{hour.toString().padStart(2, "0")}:00</span>
              </div>
              {/* Day cells */}
              {days.map((day, dayIdx) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const hourAppts = apptsByDateHour[dateStr]?.[hour] ?? [];
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "border-r border-b last:border-r-0 h-16 p-0.5 relative",
                      isToday(day) && "bg-primary/[0.02]"
                    )}
                  >
                    {hourAppts.map((appt) => (
                      <AppointmentChip key={appt.id} appt={appt} onClick={onClickAppointment} compact />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── MONTH GRID ─────────────────────────────────────────────

function MonthGrid({ selectedDate, appointments, onSelectDate, onClickAppointment }: Omit<CalendarGridProps, "viewMode">) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build array of weeks
  const weeks: Date[][] = [];
  let current = calStart;
  while (current <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(addDays(current, i));
    }
    weeks.push(week);
    current = addDays(current, 7);
  }

  // Group appointments by date
  const apptsByDate = useMemo(() => {
    const map: Record<string, AppointmentWithDetails[]> = {};
    for (const a of appointments) {
      const dateStr = a.scheduled_at.slice(0, 10);
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(a);
    }
    // Sort each day by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    }
    return map;
  }, [appointments]);

  const MAX_VISIBLE = 3;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAY_NAMES.map((name) => (
          <div key={name} className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
            {name}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 min-h-[100px]">
          {week.map((day, di) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayAppts = apptsByDate[dateStr] ?? [];
            const inMonth = isSameMonth(day, selectedDate);
            const extraCount = Math.max(0, dayAppts.length - MAX_VISIBLE);

            return (
              <div
                key={di}
                className={cn(
                  "border-r border-b last:border-r-0 p-1 min-h-[100px] cursor-pointer hover:bg-muted/30 transition-colors",
                  !inMonth && "bg-muted/20 opacity-50",
                  isToday(day) && "bg-primary/[0.04]"
                )}
                onClick={() => onSelectDate?.(day)}
              >
                {/* Day number */}
                <div className={cn(
                  "text-sm font-medium mb-0.5 flex items-center justify-center w-7 h-7 rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground",
                )}>
                  {format(day, "d")}
                </div>

                {/* Appointment chips */}
                <div className="space-y-0.5">
                  {dayAppts.slice(0, MAX_VISIBLE).map((appt) => (
                    <AppointmentChip key={appt.id} appt={appt} onClick={onClickAppointment} />
                  ))}
                  {extraCount > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground w-full text-left px-1 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          +{extraCount} altr{extraCount === 1 ? "o" : "i"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="start">
                        <div className="text-sm font-medium mb-2 capitalize">
                          {format(day, "EEEE dd MMMM", { locale: it })}
                        </div>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {dayAppts.map((appt) => (
                            <AppointmentChip key={appt.id} appt={appt} onClick={onClickAppointment} expanded />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── APPOINTMENT CHIP ───────────────────────────────────────

function AppointmentChip({
  appt,
  onClick,
  compact,
  expanded,
}: {
  appt: AppointmentWithDetails;
  onClick?: (appt: AppointmentWithDetails) => void;
  compact?: boolean;
  expanded?: boolean;
}) {
  const isIn = appt.appointment_type === "check_in";
  const time = (() => {
    const tIndex = appt.scheduled_at.indexOf("T");
    return tIndex >= 0 ? appt.scheduled_at.slice(tIndex + 1, tIndex + 6) : "";
  })();
  const clientName = appt.booking?.client
    ? `${appt.booking.client.first_name} ${appt.booking.client.last_name}`
    : "—";

  return (
    <button
      className={cn(
        "w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate flex items-center gap-1 transition-colors",
        isIn
          ? "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
          : "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60",
        appt.confirmed && "ring-1 ring-green-500/40",
        compact && "text-[10px] py-0 leading-4"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(appt);
      }}
      title={`${time} ${isIn ? "IN" : "OUT"} — ${clientName}`}
    >
      {isIn ? <LogIn className="h-2.5 w-2.5 shrink-0" /> : <LogOut className="h-2.5 w-2.5 shrink-0" />}
      <span className="font-mono mr-0.5">{time}</span>
      {!compact && <span className="truncate">{clientName}</span>}
      {compact && <span className="truncate">{appt.booking?.client?.last_name ?? ""}</span>}
      {appt.confirmed && <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-green-600 dark:text-green-400 ml-auto" />}
    </button>
  );
}
