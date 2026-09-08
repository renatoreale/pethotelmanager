import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { it as itLocale, enUS } from "date-fns/locale";
import { useClients, type Client } from "@/hooks/useClients";
import {
  useClientOpportunities,
  type ToContactOpportunity,
  type RecurringOpportunity,
  type SeasonalOpportunity,
  type HighValueOpportunity,
} from "@/hooks/useClientOpportunities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRoundX, Repeat, CalendarClock, Gem, Mail, Phone, ChevronDown } from "lucide-react";

function ContactClientButton({ client }: { client: Client }) {
  const { t } = useTranslation();
  if (!client.email && !client.phone) {
    return <span className="text-xs text-muted-foreground">{t("clients.opportunities.noContact")}</span>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          {t("clients.opportunities.contact")}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {client.email && (
          <DropdownMenuItem asChild>
            <a href={`mailto:${client.email}`}>
              <Mail className="h-4 w-4 mr-2" />
              {t("clients.opportunities.sendEmail")}
            </a>
          </DropdownMenuItem>
        )}
        {client.phone && (
          <DropdownMenuItem asChild>
            <a href={`tel:${client.phone}`}>
              <Phone className="h-4 w-4 mr-2" />
              {t("clients.opportunities.call")}
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClientRow({ client, detail }: { client: Client; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b last:border-b-0">
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">
          {client.last_name} {client.first_name}
        </div>
        <div className="text-xs text-muted-foreground truncate">{detail}</div>
      </div>
      <ContactClientButton client={client} />
    </div>
  );
}

function OpportunitySection({
  icon, title, description, count, emptyLabel, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="secondary">{count}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyLabel}</p>
        ) : (
          <div className="max-h-80 overflow-y-auto pr-1">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function ClientOpportunities() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("it") ? itLocale : enUS;
  const [inactiveDays, setInactiveDays] = useState(60);
  const [highValueThreshold, setHighValueThreshold] = useState(300);

  const { data: clients, isLoading: clientsLoading } = useClients();
  const { toContact, recurring, seasonal, highValue, isLoading: opportunitiesLoading } =
    useClientOpportunities(clients, { inactiveDays, highValueThreshold });

  const isLoading = clientsLoading || opportunitiesLoading;
  const fmtDate = (iso: string) => format(parseISO(iso), "dd/MM/yyyy", { locale: dateLocale });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          {t("clients.opportunities.subtitle")}
        </p>
        <div className="flex gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("clients.opportunities.inactiveDaysLabel")}</Label>
            <Input
              type="number" min={1} value={inactiveDays} className="w-28"
              onChange={(e) => setInactiveDays(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("clients.opportunities.highValueThresholdLabel")}</Label>
            <Input
              type="number" min={0} value={highValueThreshold} className="w-32"
              onChange={(e) => setHighValueThreshold(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <OpportunitySection
            icon={<UserRoundX className="h-4 w-4 text-destructive" />}
            title={t("clients.opportunities.toContact.title")}
            description={t("clients.opportunities.toContact.description")}
            count={toContact.length}
            emptyLabel={t("clients.opportunities.toContact.empty")}
          >
            {toContact.map((o: ToContactOpportunity) => (
              <ClientRow
                key={o.client.id}
                client={o.client}
                detail={t("clients.opportunities.toContact.lastStay", {
                  date: fmtDate(o.lastCheckOutDate), days: o.daysSinceLastStay,
                })}
              />
            ))}
          </OpportunitySection>

          <OpportunitySection
            icon={<Repeat className="h-4 w-4 text-primary" />}
            title={t("clients.opportunities.recurring.title")}
            description={t("clients.opportunities.recurring.description")}
            count={recurring.length}
            emptyLabel={t("clients.opportunities.recurring.empty")}
          >
            {recurring.map((o: RecurringOpportunity) => (
              <ClientRow
                key={o.client.id}
                client={o.client}
                detail={t("clients.opportunities.recurring.stays", { count: o.staysCount })}
              />
            ))}
          </OpportunitySection>

          <OpportunitySection
            icon={<CalendarClock className="h-4 w-4 text-amber-500" />}
            title={t("clients.opportunities.seasonal.title")}
            description={t("clients.opportunities.seasonal.description")}
            count={seasonal.length}
            emptyLabel={t("clients.opportunities.seasonal.empty")}
          >
            {seasonal.map((o: SeasonalOpportunity) => (
              <ClientRow
                key={o.client.id}
                client={o.client}
                detail={t("clients.opportunities.seasonal.lastYear", {
                  checkin: fmtDate(o.lastYearCheckIn), checkout: fmtDate(o.lastYearCheckOut),
                })}
              />
            ))}
          </OpportunitySection>

          <OpportunitySection
            icon={<Gem className="h-4 w-4 text-violet-500" />}
            title={t("clients.opportunities.highValue.title")}
            description={t("clients.opportunities.highValue.description")}
            count={highValue.length}
            emptyLabel={t("clients.opportunities.highValue.empty")}
          >
            {highValue.map((o: HighValueOpportunity) => (
              <ClientRow
                key={o.client.id}
                client={o.client}
                detail={t("clients.opportunities.highValue.total", { amount: o.totalSpent.toFixed(2) })}
              />
            ))}
          </OpportunitySection>
        </div>
      )}
    </div>
  );
}
