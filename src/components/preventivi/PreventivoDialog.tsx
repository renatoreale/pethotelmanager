import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, CalendarIcon, X, User, Cat, Dog, Home, Calendar as CalIcon, Sparkles, Percent, FileText, UserPlus, AlertTriangle } from "lucide-react";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { toast } from "sonner";
import { format, differenceInDays, parseISO, startOfDay, addDays, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { usePriceLists, useTenantConfig } from "@/hooks/usePensioneConfig";
import { useClientCats } from "@/hooks/usePreventivi";
import { useBookings } from "@/hooks/useBookings";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { OccupancyGrid, useOccupancyData, checkAvailability } from "@/components/OccupancyGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ── Types ──
interface SeasonPeriod {
  id: string;
  fromDate: string; // yyyy-MM-dd
  toDate: string;
  tariffId: string;
  days: number;
  baseCost: number;
  supplementCost: number;
  total: number;
}

interface ExtraServiceLine {
  id: string;
  priceListId: string;
  name: string;
  tariffType: string;
  quantity: number;
  unitCost: number;
  fixedCost: number;
  includedKm: number;
  extraKmCost: number;
  total: number;
}

interface DiscountLine {
  id: string;
  reason: string;
  type: "percentuale" | "fisso";
  value: number;
  amount: number;
}

let _idCounter = 0;
const genId = () => `line-${++_idCounter}-${Date.now()}`;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any;
  onCreate: any;
  onUpdate: any;
  stayCalcType: string;
  countCheckinDay: boolean;
  countCheckoutDay: boolean;
}

export function PreventivoDialog({
  open, onOpenChange, editing, onCreate, onUpdate,
  stayCalcType, countCheckinDay, countCheckoutDay,
}: Props) {
  const { data: clients } = useClients();
  const { data: priceLists } = usePriceLists();

  // ── Core state ──
  const [clientId, setClientId] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [unitsOccupied, setUnitsOccupied] = useState(1);
  const [cageUnits, setCageUnits] = useState<("singola" | "doppia")[]>(["singola"]);
  // Mixed-pet cage state (separate pools for gatti and cani)
  const [cageUnitsGatti, setCageUnitsGatti] = useState<("singola" | "doppia")[]>(["singola"]);
  const [cageUnitsCani, setCageUnitsCani] = useState<("singola" | "doppia")[]>(["singola"]);
  const [unitsGatti, setUnitsGatti] = useState(1);
  const [unitsCani, setUnitsCani] = useState(1);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositManuallySet, setDepositManuallySet] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [newClientDialogOpen, setNewClientDialogOpen] = useState(false);
  const [appointmentSyncDialog, setAppointmentSyncDialog] = useState<{
    bookingId: string;
    oldCheckIn: string;
    oldCheckOut: string;
    newCheckIn: string;
    newCheckOut: string;
    appointments: { id: string; appointment_type: string; scheduled_at: string }[];
  } | null>(null);
  const queryClient = useQueryClient();
  const [occupancyModalOpen, setOccupancyModalOpen] = useState(false);
  // ── Pricing state ──
  const [seasonPeriods, setSeasonPeriods] = useState<SeasonPeriod[]>([]);
  const [extraServices, setExtraServices] = useState<ExtraServiceLine[]>([]);
  const [discounts, setDiscounts] = useState<DiscountLine[]>([]);

  // ── Availability check data ──
  const { data: allBookings } = useBookings();
  const { data: tenantConfig } = useTenantConfig();
  const occupancyDays = tenantConfig?.occupancy_rule_days ?? 3;
  const petType = tenantConfig?.pet_type as "gatti" | "cani" | "entrambi" | undefined;

  const { data: clientCats } = useClientCats(clientId || undefined);
  
  // Determine if selected pets are mixed (both cats and dogs)
  const selectedPetTypes = useMemo(() => {
    if (!clientCats || selectedCats.length === 0) return new Set<string>();
    const selectedCatData = clientCats.filter((c: any) => selectedCats.includes(c.id));
    return new Set(selectedCatData.map((c: any) => c.pet_type).filter(Boolean));
  }, [clientCats, selectedCats]);

  const isMixedPets = petType === "entrambi" && selectedPetTypes.has("gatti") && selectedPetTypes.has("cani");
  
  // Determine pet_type of the booking from selected cats
  const bookingPetType = useMemo(() => {
    if (isMixedPets) return null; // mixed booking
    if (!clientCats || selectedCats.length === 0) return petType === "entrambi" ? null : petType ?? null;
    const selectedCatData = clientCats.filter((c: any) => selectedCats.includes(c.id));
    const types = new Set(selectedCatData.map((c: any) => c.pet_type).filter(Boolean));
    if (types.size === 1) return types.values().next().value as "gatti" | "cani";
    if (petType !== "entrambi") return petType ?? null;
    return null;
  }, [clientCats, selectedCats, petType, isMixedPets]);

  // Per-type totals for "entrambi" facilities
  const singoleGatti = (tenantConfig as any)?.num_singole_gatti ?? 0;
  const doppieGatti = (tenantConfig as any)?.num_doppie_gatti ?? 0;
  const singoleCani = (tenantConfig as any)?.num_singole_cani ?? 0;
  const doppieCani = (tenantConfig as any)?.num_doppie_cani ?? 0;

  // Get per-type cage totals
  const totalSingole = useMemo(() => {
    if (petType !== "entrambi") return tenantConfig?.num_singole ?? 0;
    if (bookingPetType === "gatti") return singoleGatti;
    if (bookingPetType === "cani") return singoleCani;
    return tenantConfig?.num_singole ?? 0;
  }, [tenantConfig, petType, bookingPetType, singoleGatti, singoleCani]);
  
  const totalDoppie = useMemo(() => {
    if (petType !== "entrambi") return tenantConfig?.num_doppie ?? 0;
    if (bookingPetType === "gatti") return doppieGatti;
    if (bookingPetType === "cani") return doppieCani;
    return tenantConfig?.num_doppie ?? 0;
  }, [tenantConfig, petType, bookingPetType, doppieGatti, doppieCani]);

  const { bookingOccupancy } = useOccupancyData(
    allBookings ?? [],
    occupancyDays,
    editing?.id,
    petType,
  );

  // For mixed pets, run availability checks on BOTH pools separately
  const availabilityResultGatti = useMemo(() => {
    if (!isMixedPets || !checkInDate || cageUnitsGatti.length === 0) return null;
    const checkInStr = format(checkInDate, "yyyy-MM-dd");
    const filteredOccupancy = bookingOccupancy.filter(bo => {
      const bpt = (bo.booking as any).pet_type;
      return bpt === "gatti" || bpt === "entrambi" || !bpt;
    });
    return checkAvailability(filteredOccupancy, checkInStr, occupancyDays, cageUnitsGatti, singoleGatti, doppieGatti);
  }, [isMixedPets, checkInDate, cageUnitsGatti, bookingOccupancy, occupancyDays, singoleGatti, doppieGatti]);

  const availabilityResultCani = useMemo(() => {
    if (!isMixedPets || !checkInDate || cageUnitsCani.length === 0) return null;
    const checkInStr = format(checkInDate, "yyyy-MM-dd");
    const filteredOccupancy = bookingOccupancy.filter(bo => {
      const bpt = (bo.booking as any).pet_type;
      return bpt === "cani" || bpt === "entrambi" || !bpt;
    });
    return checkAvailability(filteredOccupancy, checkInStr, occupancyDays, cageUnitsCani, singoleCani, doppieCani);
  }, [isMixedPets, checkInDate, cageUnitsCani, bookingOccupancy, occupancyDays, singoleCani, doppieCani]);

  const availabilityResult = useMemo(() => {
    if (isMixedPets) return null; // handled separately above
    if (!checkInDate || cageUnits.length === 0) return null;
    const checkInStr = format(checkInDate, "yyyy-MM-dd");
    const filteredOccupancy = petType === "entrambi" && bookingPetType
      ? bookingOccupancy.filter(bo => {
          const bpt = (bo.booking as any).pet_type;
          return bpt === bookingPetType || bpt === "entrambi" || !bpt;
        })
      : bookingOccupancy;
    return checkAvailability(filteredOccupancy, checkInStr, occupancyDays, cageUnits, totalSingole, totalDoppie);
  }, [isMixedPets, checkInDate, cageUnits, bookingOccupancy, occupancyDays, totalSingole, totalDoppie, petType, bookingPetType]);

  const hasConflicts = isMixedPets
    ? (availabilityResultGatti && !availabilityResultGatti.available) || (availabilityResultCani && !availabilityResultCani.available)
    : availabilityResult && !availabilityResult.available;

  const occupancyRangeStart = useMemo(() => checkInDate ? subDays(checkInDate, 5) : new Date(), [checkInDate]);
  const occupancyRangeEnd = useMemo(() => checkInDate ? addDays(checkInDate, occupancyDays + 5) : new Date(), [checkInDate, occupancyDays]);

  const today = startOfDay(new Date());

  const checkIn = checkInDate ? format(checkInDate, "yyyy-MM-dd") : "";
  const checkOut = checkOutDate ? format(checkOutDate, "yyyy-MM-dd") : "";

  const stayLabel = stayCalcType === "notti" ? "notti" : "giorni";

  // ── Duration calculation ──
  const calcDuration = useCallback((ci: string, co: string) => {
    if (!ci || !co) return 0;
    const diff = differenceInDays(parseISO(co), parseISO(ci));
    if (diff < 0) return 0;
    if (stayCalcType === "notti") return diff;
    let days = diff + 1;
    if (!countCheckinDay) days -= 1;
    if (!countCheckoutDay) days -= 1;
    return Math.max(0, days);
  }, [stayCalcType, countCheckinDay, countCheckoutDay]);

  const calcPeriodDays = useCallback((from: string, to: string) => {
    if (!from || !to) return 0;
    const diff = differenceInDays(parseISO(to), parseISO(from));
    if (diff < 0) return 0;
    return stayCalcType === "notti" ? diff : diff + 1;
  }, [stayCalcType]);

  const duration = calcDuration(checkIn, checkOut);

  // ── Reset on open ──
  const resetForm = () => {
    if (editing) {
      setClientId(editing.client_id);
      const editClient = clients?.find((c: any) => c.id === editing.client_id);
      setClientSearch(editClient ? `${editClient.first_name} ${editClient.last_name}` : "");
      const arr: ("singola" | "doppia")[] = [];
      for (let i = 0; i < editing.units_occupied; i++) {
        arr.push(i === 0 ? editing.cage_pool_type : "singola");
      }
      setCageUnits(arr);
      setCheckInDate(editing.check_in_date ? parseISO(editing.check_in_date) : undefined);
      setCheckOutDate(editing.check_out_date ? parseISO(editing.check_out_date) : undefined);
      setSelectedCats(editing.booking_cats?.map((bc: any) => bc.cat_id) ?? []);
      setNotes((editing.notes ?? "").split("\n").filter((line: string) => !line.startsWith("[")).join("\n").trim());
      setTotalAmount(Number(editing.total_amount ?? 0));
      setDepositAmount(Number(editing.deposit_amount ?? 0));

      const bd = editing.price_breakdown;
      if (bd) {
        setSeasonPeriods(bd.seasonPeriods ?? []);
        setExtraServices(bd.extraServices ?? []);
        setDiscounts(bd.discounts ?? []);
        if (bd.cageUnits) {
          setCageUnits(bd.cageUnits);
          setUnitsOccupied(bd.cageUnits.length);
        }
        if (bd.cageUnitsGatti) { setCageUnitsGatti(bd.cageUnitsGatti); setUnitsGatti(bd.cageUnitsGatti.length); }
        if (bd.cageUnitsCani) { setCageUnitsCani(bd.cageUnitsCani); setUnitsCani(bd.cageUnitsCani.length); }
      } else {
        setSeasonPeriods([]);
        setExtraServices([]);
        setDiscounts([]);
      }
      setDepositManuallySet(false);
    } else {
      setClientId("");
      setUnitsOccupied(1);
      setCageUnits(["singola"]);
      setCageUnitsGatti(["singola"]);
      setCageUnitsCani(["singola"]);
      setUnitsGatti(1);
      setUnitsCani(1);
      setCheckInDate(undefined);
      setCheckOutDate(undefined);
      setSelectedCats([]);
      setNotes("");
      setTotalAmount(0);
      setDepositAmount(0);
      setSeasonPeriods([]);
      setExtraServices([]);
      setDiscounts([]);
      setDepositManuallySet(false);
    }
    setClientSearch("");
    setClientDropdownOpen(false);
  };

  const clientSearchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (open) resetForm(); }, [open, editing]);

  useEffect(() => {
    if (checkInDate && checkOutDate && checkOutDate < checkInDate) {
      setCheckOutDate(undefined);
    }
  }, [checkInDate]);

  // Sync cage units arrays
  useEffect(() => {
    if (!isMixedPets) {
      setCageUnits(prev => {
        const newArr = [...prev];
        while (newArr.length < unitsOccupied) newArr.push("singola");
        return newArr.slice(0, unitsOccupied);
      });
    }
  }, [unitsOccupied, isMixedPets]);

  useEffect(() => {
    setCageUnitsGatti(prev => {
      const newArr = [...prev];
      while (newArr.length < unitsGatti) newArr.push("singola");
      return newArr.slice(0, unitsGatti);
    });
  }, [unitsGatti]);

  useEffect(() => {
    setCageUnitsCani(prev => {
      const newArr = [...prev];
      while (newArr.length < unitsCani) newArr.push("singola");
      return newArr.slice(0, unitsCani);
    });
  }, [unitsCani]);

  // ── Seasonal tariffs (filtered by tenant pet_type) ──
  const tenantPetType = tenantConfig?.pet_type as "gatti" | "cani" | "entrambi" | undefined;
  const seasonalTariffs = useMemo(() => {
    if (!priceLists) return [];
    return priceLists.filter((pl: any) => {
      if (pl.tariff_type !== "stagionale" || !pl.is_active) return false;
      if (!pl.pet_type || !tenantPetType || tenantPetType === "entrambi") return true;
      return pl.pet_type === tenantPetType;
    });
  }, [priceLists, tenantPetType]);

  const availableExtras = useMemo(() => {
    if (!priceLists) return [];
    return priceLists.filter((pl: any) => {
      if (pl.tariff_type === "stagionale" || !pl.is_active) return false;
      if (!pl.pet_type || !tenantPetType || tenantPetType === "entrambi") return true;
      return pl.pet_type === tenantPetType;
    });
  }, [priceLists, tenantPetType]);

  // ── Period cost calculation helper ──
  const calcPeriodCost = useCallback((days: number, tariff: any, numCats: number) => {
    if (!tariff || numCats === 0) return { baseCost: 0, supplementCost: 0, total: 0 };
    const baseCost = Number(tariff.price_per_day) * days * numCats;
    const extraCats = Math.max(0, numCats - 1);
    const supplementCost = extraCats * Number(tariff.extra_cat_supplement ?? 0) * days;
    return { baseCost, supplementCost, total: baseCost + supplementCost };
  }, []);

  // ── Season period helpers ──
  const addSeasonPeriod = () => {
    const defaultTariff = seasonalTariffs[0];
    const days = calcPeriodDays(checkIn, checkOut);
    const costs = calcPeriodCost(days, defaultTariff, selectedCats.length);
    setSeasonPeriods(prev => [...prev, {
      id: genId(),
      fromDate: checkIn,
      toDate: checkOut,
      tariffId: defaultTariff?.id ?? "",
      days,
      ...costs,
    }]);
  };

  const updatePeriod = (idx: number, field: string, value: any) => {
    setSeasonPeriods(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, [field]: value };

      if (field === "tariffId" || field === "fromDate" || field === "toDate") {
        updated.days = calcPeriodDays(updated.fromDate, updated.toDate);
        const tariff = seasonalTariffs.find((t: any) => t.id === (field === "tariffId" ? value : updated.tariffId));
        const costs = calcPeriodCost(updated.days, tariff, selectedCats.length);
        Object.assign(updated, costs);
      }

      return updated;
    }));
  };

  const numSelectedCats = selectedCats.length;
  useEffect(() => {
    setSeasonPeriods(prev => {
      if (prev.length === 0) return prev;
      return prev.map(p => {
        const tariff = seasonalTariffs?.find((t: any) => t.id === p.tariffId);
        const days = calcPeriodDays(p.fromDate, p.toDate);
        const costs = calcPeriodCost(days, tariff, numSelectedCats);
        return { ...p, days, ...costs };
      });
    });
  }, [numSelectedCats, seasonalTariffs, calcPeriodDays, calcPeriodCost]);

  const removePeriod = (idx: number) => {
    setSeasonPeriods(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Extra services helpers ──
  const addExtraService = (plId: string) => {
    const pl = availableExtras.find((p: any) => p.id === plId);
    if (!pl) return;
    const line: ExtraServiceLine = {
      id: genId(),
      priceListId: pl.id,
      name: pl.name,
      tariffType: pl.tariff_type,
      quantity: pl.tariff_type === "extra_una_tantum" ? 1 : (pl.tariff_type === "extra_giornaliero" ? Math.max(1, duration) : 0),
      unitCost: Number(pl.price_per_day ?? 0),
      fixedCost: Number(pl.fixed_cost ?? 0),
      includedKm: Number(pl.included_km ?? 0),
      extraKmCost: Number(pl.extra_km_cost ?? 0),
      total: 0,
    };
    line.total = calcExtraTotal(line);
    setExtraServices(prev => [...prev, line]);
  };

  const calcExtraTotal = (line: ExtraServiceLine): number => {
    if (line.tariffType === "extra_giornaliero") return line.unitCost * line.quantity;
    if (line.tariffType === "extra_km") {
      const extraKm = Math.max(0, line.quantity - line.includedKm);
      return line.fixedCost + extraKm * line.extraKmCost;
    }
    return line.fixedCost;
  };

  const updateExtraQuantity = (idx: number, qty: number) => {
    setExtraServices(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const updated = { ...s, quantity: qty };
      updated.total = calcExtraTotal(updated);
      return updated;
    }));
  };

  const removeExtraService = (idx: number) => {
    setExtraServices(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Discounts helpers ──
  const addDiscount = () => {
    setDiscounts(prev => [...prev, {
      id: genId(),
      reason: "lungo_periodo",
      type: "percentuale",
      value: 0,
      amount: 0,
    }]);
  };

  const removeDiscount = (idx: number) => {
    setDiscounts(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Grand total calculation ──
  const seasonTotal = useMemo(() => seasonPeriods.reduce((sum, p) => sum + p.total, 0), [seasonPeriods]);
  const extrasTotal = useMemo(() => extraServices.reduce((sum, s) => sum + s.total, 0), [extraServices]);

  useEffect(() => {
    setDiscounts(prev => prev.map(d => ({
      ...d,
      amount: d.type === "percentuale" ? Math.round(seasonTotal * d.value) / 100 : d.value,
    })));
  }, [seasonTotal]);

  const updateDiscount = (idx: number, field: string, value: any) => {
    setDiscounts(prev => prev.map((d, i) => {
      if (i !== idx) return d;
      const updated = { ...d, [field]: value };
      if (field === "value" || field === "type") {
        updated.amount = updated.type === "percentuale"
          ? Math.round(seasonTotal * Number(updated.value)) / 100
          : Number(updated.value);
      }
      return updated;
    }));
  };

  const discountTotal = useMemo(() => discounts.reduce((sum, d) => sum + d.amount, 0), [discounts]);
  const discountedStay = Math.max(0, seasonTotal - discountTotal);
  const grandTotal = discountedStay + extrasTotal;

  // ── Period validation ──
  const periodDaysTotal = useMemo(() => seasonPeriods.reduce((sum, p) => sum + p.days, 0), [seasonPeriods]);
  const periodDaysMismatch = seasonPeriods.length > 0 && duration > 0 && periodDaysTotal !== duration;

  const periodGaps = useMemo(() => {
    if (seasonPeriods.length < 2 || !checkIn || !checkOut) return [];
    const sorted = [...seasonPeriods].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    const gaps: string[] = [];
    if (sorted[0].fromDate > checkIn) {
      gaps.push(`${checkIn} → ${sorted[0].fromDate}`);
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      const endCurrent = sorted[i].toDate;
      const startNext = sorted[i + 1].fromDate;
      const expectedNext = stayCalcType === "notti" ? endCurrent : format(
        new Date(new Date(endCurrent).getTime() + 86400000), "yyyy-MM-dd"
      );
      if (startNext > expectedNext) {
        gaps.push(`${expectedNext} → ${startNext}`);
      }
    }
    if (sorted[sorted.length - 1].toDate < checkOut) {
      const lastEnd = sorted[sorted.length - 1].toDate;
      const expectedStart = stayCalcType === "notti" ? lastEnd : format(
        new Date(new Date(lastEnd).getTime() + 86400000), "yyyy-MM-dd"
      );
      if (expectedStart < checkOut || (stayCalcType === "notti" && lastEnd < checkOut)) {
        gaps.push(`${expectedStart} → ${checkOut}`);
      }
    }
    return gaps;
  }, [seasonPeriods, checkIn, checkOut, stayCalcType]);

  useEffect(() => {
    if (seasonPeriods.length > 0 || extraServices.length > 0) {
      setTotalAmount(grandTotal);
    }
  }, [grandTotal, seasonPeriods.length, extraServices.length]);

  useEffect(() => {
    if (!depositManuallySet) {
      setDepositAmount(Math.round(totalAmount * 50) / 100);
    }
  }, [totalAmount, depositManuallySet]);

  // ── Client filter ──
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c: any) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.cats ?? []).some((cat: any) => (cat.name ?? "").toLowerCase().includes(q))
    );
  }, [clients, clientSearch]);

  // ── Cage helpers ──
  const updateCageUnit = (idx: number, type: "singola" | "doppia") => {
    setCageUnits(prev => prev.map((t, i) => i === idx ? type : t));
  };

  const updateCageUnitGatti = (idx: number, type: "singola" | "doppia") => {
    setCageUnitsGatti(prev => prev.map((t, i) => i === idx ? type : t));
  };

  const updateCageUnitCani = (idx: number, type: "singola" | "doppia") => {
    setCageUnitsCani(prev => prev.map((t, i) => i === idx ? type : t));
  };

  const numDoppie = cageUnits.filter(t => t === "doppia").length;
  const primaryCageType: "singola" | "doppia" = numDoppie > 0 ? "doppia" : "singola";

  // ── Toggle cat ──
  const toggleCat = (catId: string) => {
    setSelectedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  // ── Save ──
  const handleSave = async () => {
    if (!clientId) { toast.error("Seleziona un cliente"); return; }
    if (!checkIn || !checkOut) { toast.error("Date check-in/out obbligatorie"); return; }
    if (selectedCats.length === 0) { toast.error("Seleziona almeno un pet"); return; }

    // Calculate effective units and cage type
    const effectiveUnitsOccupied = isMixedPets
      ? unitsGatti + unitsCani
      : unitsOccupied;
    const effectivePrimaryCageType = isMixedPets ? "singola" : primaryCageType;
    const effectiveCageUnits = isMixedPets
      ? [...cageUnitsGatti, ...cageUnitsCani]
      : cageUnits;

    // Build price_breakdown JSON
    const priceBreakdown = {
      seasonPeriods,
      extraServices,
      discounts,
      cageUnits: effectiveCageUnits,
      ...(isMixedPets ? { cageUnitsGatti, cageUnitsCani } : {}),
      seasonTotal,
      extrasTotal,
      discountTotal,
      discountedStay,
      grandTotal,
    };

    // Build breakdown notes for display
    const breakdownParts: string[] = [];
    if (isMixedPets) {
      const nsG = cageUnitsGatti.filter(t => t === "singola").length;
      const ndG = cageUnitsGatti.filter(t => t === "doppia").length;
      const nsC = cageUnitsCani.filter(t => t === "singola").length;
      const ndC = cageUnitsCani.filter(t => t === "doppia").length;
      breakdownParts.push(`[Casette Gatti: ${nsG}S + ${ndG}D · Casette Cani: ${nsC}S + ${ndC}D]`);
    } else if (effectiveUnitsOccupied > 1) {
      const ns = effectiveCageUnits.filter(t => t === "singola").length;
      const nd = effectiveCageUnits.filter(t => t === "doppia").length;
      breakdownParts.push(`[Casette: ${ns}S + ${nd}D]`);
    }
    if (seasonPeriods.length > 0) {
      const parts = seasonPeriods.map(p => {
        const tariff = seasonalTariffs.find((t: any) => t.id === p.tariffId);
        return `${p.fromDate} → ${p.toDate}: ${tariff?.name ?? "?"} (${p.days} ${stayLabel}, €${p.total.toFixed(2)})`;
      });
      breakdownParts.push(`[Periodi: ${parts.join("; ")}]`);
    }
    if (discounts.length > 0) {
      const parts = discounts.filter(d => d.amount > 0).map(d => {
        const label = d.reason === "lungo_periodo" ? "Lungo periodo" : d.reason === "multi_gatto" ? "Multi-gatto" : "Altro";
        return `${label}: -€${d.amount.toFixed(2)}`;
      });
      if (parts.length > 0) breakdownParts.push(`[Sconti: ${parts.join("; ")}]`);
    }

    const fullNotes = [notes.trim(), ...breakdownParts].filter(Boolean).join("\n");

    // Determine booking pet_type
    const savePetType = isMixedPets ? "entrambi" : (bookingPetType ?? undefined);

    try {
      if (editing) {
        const datesChanged =
          checkIn !== editing.check_in_date || checkOut !== editing.check_out_date;

        await onUpdate.mutateAsync({
          id: editing.id,
          client_id: clientId,
          cage_pool_type: effectivePrimaryCageType,
          units_occupied: effectiveUnitsOccupied,
          check_in_date: checkIn,
          check_out_date: checkOut,
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          notes: fullNotes || null,
          cat_ids: selectedCats,
          price_breakdown: priceBreakdown,
          ...(savePetType ? { pet_type: savePetType } : {}),
        });

        if (datesChanged && editing.appointments && editing.appointments.length > 0) {
          setAppointmentSyncDialog({
            bookingId: editing.id,
            oldCheckIn: editing.check_in_date,
            oldCheckOut: editing.check_out_date,
            newCheckIn: checkIn,
            newCheckOut: checkOut,
            appointments: editing.appointments,
          });
          toast.success("Prenotazione aggiornata");
          return;
        }

        toast.success("Preventivo aggiornato");
      } else {
        await onCreate.mutateAsync({
          client_id: clientId,
          cage_pool_type: effectivePrimaryCageType,
          units_occupied: effectiveUnitsOccupied,
          check_in_date: checkIn,
          check_out_date: checkOut,
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          notes: fullNotes || undefined,
          cat_ids: selectedCats,
          price_breakdown: priceBreakdown,
          pet_type: savePetType ?? undefined,
        });
        toast.success("Preventivo creato");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const invalidateAppointmentQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["appointments-by-date"] });
    queryClient.invalidateQueries({ queryKey: ["appointments-by-range"] });
    queryClient.invalidateQueries({ queryKey: ["appointments-all"] });
    queryClient.invalidateQueries({ queryKey: ["appointment-counts"] });
    queryClient.invalidateQueries({ queryKey: ["booking-appointments"] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["preventivi"] });
  };

  const handleUpdateAppointments = async () => {
    if (!appointmentSyncDialog) return;
    const { appointments, newCheckIn, newCheckOut } = appointmentSyncDialog;
    try {
      for (const appt of appointments) {
        const oldDate = appt.scheduled_at;
        const time = oldDate.split("T")[1];
        const newDate = appt.appointment_type === "check_in" ? newCheckIn : newCheckOut;
        await supabase
          .from("appointments")
          .update({ scheduled_at: `${newDate}T${time}` })
          .eq("id", appt.id);
      }
      invalidateAppointmentQueries();
      toast.success("Appuntamenti aggiornati alle nuove date");
    } catch (err: any) {
      toast.error(err.message || "Errore aggiornamento appuntamenti");
    }
    setAppointmentSyncDialog(null);
    onOpenChange(false);
  };

  const handleDeleteAppointments = async () => {
    if (!appointmentSyncDialog) return;
    const { bookingId } = appointmentSyncDialog;
    try {
      await supabase.from("appointments").delete().eq("booking_id", bookingId);
      await supabase
        .from("bookings")
        .update({ status: "confermata" as any })
        .eq("id", bookingId);
      invalidateAppointmentQueries();
      toast.success("Appuntamenti eliminati, stato riportato a Confermata");
    } catch (err: any) {
      toast.error(err.message || "Errore eliminazione appuntamenti");
    }
    setAppointmentSyncDialog(null);
    onOpenChange(false);
  };

  // Helper to render cage unit selectors for a specific pool
  const renderCageSelector = (
    label: string,
    icon: React.ReactNode,
    units: number,
    setUnits: (n: number) => void,
    cageArr: ("singola" | "doppia")[],
    updateFn: (idx: number, type: "singola" | "doppia") => void,
    maxSingole: number,
    maxDoppie: number,
  ) => (
    <div className="space-y-2 p-3 rounded-md border bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{label}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          (S: {maxSingole} · D: {maxDoppie})
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">N° casette</Label>
          <Input type="number" min={1} max={20} value={units}
            onChange={(e) => setUnits(Math.max(1, Number(e.target.value)))} />
        </div>
      </div>
      {units === 1 ? (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={cageArr[0]} onValueChange={(v) => updateFn(0, v as "singola" | "doppia")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="singola">Singola</SelectItem>
              <SelectItem value="doppia">Doppia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {cageArr.map((type, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-20">Casetta {idx + 1}</span>
              <Select value={type} onValueChange={(v) => updateFn(idx, v as "singola" | "doppia")}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="singola">Singola</SelectItem>
                  <SelectItem value="doppia">Doppia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifica Preventivo" : "Nuovo Preventivo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">

          {/* ═══════════════════════════════════════════ */}
          {/* SEZIONE 1: ANAGRAFICA                      */}
          {/* ═══════════════════════════════════════════ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Anagrafica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <div ref={clientSearchRef} className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca cliente per nome, email o telefono..."
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); if (e.target.value.trim().length >= 1) setClientDropdownOpen(true); else setClientDropdownOpen(false); }}
                      onFocus={() => { if (clientSearch.trim().length >= 1) setClientDropdownOpen(true); }}
                      className="pl-10"
                    />
                    {clientDropdownOpen && filteredClients.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden max-h-60 overflow-y-auto">
                        {filteredClients.slice(0, 10).map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            className={cn(
                              "flex flex-col gap-0.5 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                              clientId === c.id && "bg-accent"
                            )}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setClientId(c.id);
                              setSelectedCats([]);
                              setClientSearch(`${c.first_name} ${c.last_name}`);
                              setClientDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{c.first_name} {c.last_name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              {(c.cats ?? []).length > 0 && (
                                <span>🐱 {(c.cats as any[]).map((cat: any) => cat.name).join(", ")}</span>
                              )}
                              {c.phone && <span>📞 {c.phone}</span>}
                              {c.email && <span>✉️ {c.email}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewClientDialogOpen(true)}
                    className="shrink-0 gap-1">
                    <UserPlus className="h-4 w-4" /> Nuovo
                  </Button>
                </div>
                {clientId && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <User className="h-3 w-3" />
                      {clients?.find((c: any) => c.id === clientId)?.first_name}{" "}
                      {clients?.find((c: any) => c.id === clientId)?.last_name}
                      <button type="button" className="ml-1 hover:text-destructive" onClick={() => { setClientId(""); setClientSearch(""); setSelectedCats([]); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                )}
              </div>

              {clientId && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Cat className="h-3.5 w-3.5" /> Pets *</Label>
                  {!clientCats?.length ? (
                    <p className="text-sm text-muted-foreground">Nessun pet registrato</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {clientCats.map((cat: any) => (
                        <div key={cat.id} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent"
                          onClick={() => toggleCat(cat.id)}>
                          <Checkbox checked={selectedCats.includes(cat.id)} />
                          <span className="text-sm font-medium">{cat.name}</span>
                          {cat.pet_type === "cani" && <Badge variant="outline" className="text-xs gap-1"><Dog className="h-3 w-3" />Cane</Badge>}
                          {cat.pet_type === "gatti" && <Badge variant="outline" className="text-xs gap-1"><Cat className="h-3 w-3" />Gatto</Badge>}
                          {cat.needs_double_cage && <Badge variant="outline" className="text-xs">Casetta doppia</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Separator />
              <div className="space-y-3">
                <Label className="flex items-center gap-1"><Home className="h-3.5 w-3.5" /> Casette</Label>
                
                {isMixedPets ? (
                  /* ── Mixed pets: separate cage selectors for gatti and cani ── */
                  <div className="space-y-3">
                    {renderCageSelector(
                      "Casette Gatti 🐱", <Cat className="h-4 w-4 text-primary" />,
                      unitsGatti, setUnitsGatti,
                      cageUnitsGatti, updateCageUnitGatti,
                      singoleGatti, doppieGatti,
                    )}
                    {renderCageSelector(
                      "Casette Cani 🐶", <Dog className="h-4 w-4 text-primary" />,
                      unitsCani, setUnitsCani,
                      cageUnitsCani, updateCageUnitCani,
                      singoleCani, doppieCani,
                    )}
                  </div>
                ) : (
                  /* ── Single pet type: standard cage selector ── */
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">N° casette</Label>
                        <Input type="number" min={1} max={20} value={unitsOccupied}
                          onChange={(e) => setUnitsOccupied(Math.max(1, Number(e.target.value)))} />
                      </div>
                    </div>
                    {unitsOccupied === 1 ? (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <Select value={cageUnits[0]} onValueChange={(v) => setCageUnits([v as "singola" | "doppia"])}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="singola">Singola</SelectItem>
                            <SelectItem value="doppia">Doppia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2 p-3 rounded-md border bg-muted/30">
                        <div className="grid grid-cols-2 gap-2">
                          {cageUnits.map((type, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground w-20">Casetta {idx + 1}</span>
                              <Select value={type} onValueChange={(v) => updateCageUnit(idx, v as "singola" | "doppia")}>
                                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="singola">Singola</SelectItem>
                                  <SelectItem value="doppia">Doppia</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Separator />
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><CalIcon className="h-3.5 w-3.5" /> Date soggiorno</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Check-in *</Label>
                    <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkInDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkInDate ? format(checkInDate, "dd MMM yyyy", { locale: it }) : "Seleziona data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={checkInDate} onSelect={(d) => { setCheckInDate(d); setCheckInOpen(false); }}
                          disabled={(date) => date < today} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Check-out *</Label>
                    <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkOutDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOutDate ? format(checkOutDate, "dd MMM yyyy", { locale: it }) : "Seleziona data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={checkOutDate} onSelect={(d) => { setCheckOutDate(d); setCheckOutOpen(false); }}
                          disabled={(date) => { if (!checkInDate) return date < today; return date < checkInDate; }}
                          initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {duration > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Durata: <strong>{duration} {duration === 1 ? (stayLabel === "notti" ? "notte" : "giorno") : stayLabel}</strong>
                  </p>
                )}
                {/* Availability conflicts */}
                {isMixedPets && availabilityResultGatti && !availabilityResultGatti.available && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      🐱 Casette gatti insufficienti: {availabilityResultGatti.conflicts.map(c =>
                        `${format(parseISO(c.date), "dd/MM")} (${c.type}: ${c.occupied}/${c.total})`
                      ).join(", ")}
                    </AlertDescription>
                  </Alert>
                )}
                {isMixedPets && availabilityResultCani && !availabilityResultCani.available && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      🐶 Casette cani insufficienti: {availabilityResultCani.conflicts.map(c =>
                        `${format(parseISO(c.date), "dd/MM")} (${c.type}: ${c.occupied}/${c.total})`
                      ).join(", ")}
                    </AlertDescription>
                  </Alert>
                )}
                {!isMixedPets && hasConflicts && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        ⚠️ Disponibilità insufficiente nei giorni: {availabilityResult!.conflicts.map(c =>
                          `${format(parseISO(c.date), "dd/MM")} (${c.type}: ${c.occupied}/${c.total})`
                        ).join(", ")}
                      </span>
                      <Button variant="outline" size="sm" className="ml-2 shrink-0" onClick={() => setOccupancyModalOpen(true)}>
                        Vedi occupazione
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {(isMixedPets && hasConflicts) && (
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => setOccupancyModalOpen(true)}>
                    Vedi occupazione
                  </Button>
                )}
              </div>

              <Separator />
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Note</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note aggiuntive..." rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* ═══════════════════════════════════════════ */}
          {/* SEZIONE 2: SOGGIORNO                       */}
          {/* ═══════════════════════════════════════════ */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" /> Soggiorno
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addSeasonPeriod} disabled={seasonalTariffs.length === 0 || !checkIn || !checkOut}>
                  <Plus className="mr-1 h-3 w-3" /> Aggiungi periodo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {seasonalTariffs.length === 0 && (
                <p className="text-xs text-muted-foreground">Nessuna tariffa stagionale attiva nel listino</p>
              )}
              {seasonPeriods.map((period, idx) => (
                <div key={period.id} className="p-3 rounded-md border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Dal</Label>
                        <Input type="date" value={period.fromDate} min={checkIn} max={checkOut}
                          onChange={(e) => updatePeriod(idx, "fromDate", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Al</Label>
                        <Input type="date" value={period.toDate} min={period.fromDate || checkIn} max={checkOut}
                          onChange={(e) => updatePeriod(idx, "toDate", e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removePeriod(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={period.tariffId} onValueChange={(v) => updatePeriod(idx, "tariffId", v)}>
                      <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Seleziona tariffa" /></SelectTrigger>
                      <SelectContent>
                        {seasonalTariffs.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name} (€{Number(t.price_per_day).toFixed(2)}/{stayLabel === "notti" ? "notte" : "giorno"})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{period.days} {stayLabel}</span>
                    <span className="text-sm font-medium whitespace-nowrap">€ {period.total.toFixed(2)}</span>
                  </div>
                  {selectedCats.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedCats.length} pet{selectedCats.length === 1 ? "" : "s"} × {period.days} {stayLabel}
                      {period.supplementCost > 0 && ` (incl. suppl. pet extra: € ${period.supplementCost.toFixed(2)})`}
                    </p>
                  )}
                </div>
              ))}

              {/* Alert periodi */}
              {seasonPeriods.length > 0 && duration > 0 && periodDaysMismatch && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  ⚠️ Periodi: {periodDaysTotal} {stayLabel} — Soggiorno: {duration} {stayLabel}
                </div>
              )}
              {seasonPeriods.length > 0 && duration > 0 && periodGaps.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  ⚠️ Date scoperte: {periodGaps.join(", ")}
                </div>
              )}

              {/* Sconti */}
              {seasonPeriods.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1 text-sm"><Percent className="h-3.5 w-3.5" /> Sconti</Label>
                      <Button variant="outline" size="sm" onClick={addDiscount}>
                        <Plus className="mr-1 h-3 w-3" /> Sconto
                      </Button>
                    </div>
                    {discounts.map((disc, idx) => (
                      <div key={disc.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                        <Select value={disc.reason} onValueChange={(v) => updateDiscount(idx, "reason", v)}>
                          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lungo_periodo">Lungo periodo</SelectItem>
                            <SelectItem value="multi_gatto">Multi-gatto</SelectItem>
                            <SelectItem value="altro">Altro</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={disc.type} onValueChange={(v) => updateDiscount(idx, "type", v)}>
                          <SelectTrigger className="w-20 h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentuale">%</SelectItem>
                            <SelectItem value="fisso">€</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" min={0} step={disc.type === "percentuale" ? 1 : 0.5}
                          value={disc.value} onChange={(e) => updateDiscount(idx, "value", Number(e.target.value))}
                          className="w-20 h-8 text-sm" />
                        <span className="text-sm font-medium text-destructive whitespace-nowrap">-€ {disc.amount.toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDiscount(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Subtotale soggiorno */}
              {seasonPeriods.length > 0 && (
                <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-1">
                  <div className="text-sm flex justify-between">
                    <span className="text-muted-foreground">Soggiorno ({seasonPeriods.length} period{seasonPeriods.length === 1 ? "o" : "i"})</span>
                    <span>€ {seasonTotal.toFixed(2)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="text-sm flex justify-between text-destructive">
                      <span>Sconto</span>
                      <span>-€ {discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="text-sm font-bold flex justify-between border-t border-primary/20 pt-1">
                    <span>Totale soggiorno</span>
                    <span>€ {discountedStay.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══════════════════════════════════════════ */}
          {/* SEZIONE 3: SERVIZI EXTRA                   */}
          {/* ═══════════════════════════════════════════ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Servizi Extra
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableExtras.length > 0 ? (
                <Select onValueChange={addExtraService} value="">
                  <SelectTrigger><SelectValue placeholder="Aggiungi servizio extra..." /></SelectTrigger>
                  <SelectContent>
                    {availableExtras.map((pl: any) => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.name} ({pl.tariff_type === "extra_giornaliero" ? "giornaliero" : pl.tariff_type === "extra_km" ? "km" : "una tantum"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">Nessun servizio extra nel listino</p>
              )}
              {extraServices.map((service, idx) => (
                <div key={service.id} className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{service.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {service.tariffType === "extra_giornaliero" ? "Giornaliero" : service.tariffType === "extra_km" ? "Km" : "Una tantum"}
                      </Badge>
                    </div>
                    {service.tariffType === "extra_giornaliero" && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Giorni:</Label>
                        <Input type="number" min={1} className="w-20 h-7 text-sm"
                          value={service.quantity} onChange={(e) => updateExtraQuantity(idx, Number(e.target.value))} />
                        <span className="text-xs text-muted-foreground">× € {service.unitCost.toFixed(2)}/giorno</span>
                      </div>
                    )}
                    {service.tariffType === "extra_km" && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Km totali:</Label>
                        <Input type="number" min={0} className="w-20 h-7 text-sm"
                          value={service.quantity} onChange={(e) => updateExtraQuantity(idx, Number(e.target.value))} />
                        <span className="text-xs text-muted-foreground">
                          (base € {service.fixedCost.toFixed(2)} + {service.includedKm} km incl., extra € {service.extraKmCost.toFixed(2)}/km)
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">€ {service.total.toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeExtraService(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {extraServices.length > 0 && (
                <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                  <div className="text-sm font-bold flex justify-between">
                    <span>Totale servizi extra</span>
                    <span>€ {extrasTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══════════════════════════════════════════ */}
          {/* SEZIONE 4: TOTALE PREVENTIVO               */}
          {/* ═══════════════════════════════════════════ */}
          <Card className="border-primary/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">💰 Totale Preventivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-muted/50 p-3 space-y-1">
                {discountedStay > 0 && (
                  <div className="text-sm flex justify-between">
                    <span className="text-muted-foreground">Soggiorno{discountTotal > 0 ? " (scontato)" : ""}</span>
                    <span>€ {discountedStay.toFixed(2)}</span>
                  </div>
                )}
                {extrasTotal > 0 && (
                  <div className="text-sm flex justify-between">
                    <span className="text-muted-foreground">Servizi extra</span>
                    <span>€ {extrasTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="text-base font-bold flex justify-between border-t border-border pt-1">
                  <span>Totale preventivo</span>
                  <span>€ {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Caparra richiesta (€)</Label>
                <Input type="number" min={0} step={0.5} value={depositAmount}
                  onChange={(e) => { setDepositAmount(Number(e.target.value)); setDepositManuallySet(true); }} />
                <p className="text-xs text-muted-foreground">Default: 50% del totale</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={
            onCreate.isPending || onUpdate.isPending ||
            selectedCats.length === 0 ||
            (seasonPeriods.length === 0 && extraServices.length === 0) ||
            totalAmount <= 0
          }>
            {editing ? "Aggiorna" : "Crea Preventivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ClientDialog
      open={newClientDialogOpen}
      onOpenChange={(v) => {
        setNewClientDialogOpen(v);
      }}
    />

    <AlertDialog open={!!appointmentSyncDialog} onOpenChange={(open) => { if (!open) { setAppointmentSyncDialog(null); onOpenChange(false); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Date modificate – Appuntamenti esistenti</AlertDialogTitle>
          <AlertDialogDescription>
            Le date di check-in/check-out sono cambiate. Ci sono appuntamenti già fissati per questa prenotazione. Cosa vuoi fare?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={() => { setAppointmentSyncDialog(null); onOpenChange(false); }}>
            Non fare nulla
          </AlertDialogCancel>
          <Button variant="outline" onClick={handleDeleteAppointments}>
            Elimina appuntamenti
          </Button>
          <Button onClick={handleUpdateAppointments}>
            Aggiorna alle nuove date
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Occupancy modal */}
    <Dialog open={occupancyModalOpen} onOpenChange={setOccupancyModalOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Occupazione casette
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">
          Periodo: {checkInDate ? format(occupancyRangeStart, "dd MMM yyyy", { locale: it }) : "—"} → {checkInDate ? format(occupancyRangeEnd, "dd MMM yyyy", { locale: it }) : "—"}
          {" "}· Regola occupazione: {occupancyDays} giorni dal check-in
        </p>
        {isMixedPets || petType === "entrambi" ? (
          <>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">🐱 Casette Gatti</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                <span>Singole: {singoleGatti} · Doppie: {doppieGatti}</span>
              </div>
              {allBookings && (
                <OccupancyGrid
                  bookings={(allBookings ?? []).filter(b => (b as any).pet_type === "gatti" || (b as any).pet_type === "entrambi")}
                  occupancyDays={occupancyDays}
                  totalSingole={singoleGatti}
                  totalDoppie={doppieGatti}
                  rangeStart={occupancyRangeStart}
                  rangeEnd={occupancyRangeEnd}
                  excludeBookingId={editing?.id}
                  highlightDate={checkInDate ? format(checkInDate, "yyyy-MM-dd") : undefined}
                  compact
                  petType="gatti"
                />
              )}
            </div>
            <div className="space-y-1 mt-4">
              <h3 className="text-sm font-semibold">🐶 Casette Cani</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                <span>Singole: {singoleCani} · Doppie: {doppieCani}</span>
              </div>
              {allBookings && (
                <OccupancyGrid
                  bookings={(allBookings ?? []).filter(b => (b as any).pet_type === "cani" || (b as any).pet_type === "entrambi")}
                  occupancyDays={occupancyDays}
                  totalSingole={singoleCani}
                  totalDoppie={doppieCani}
                  rangeStart={occupancyRangeStart}
                  rangeEnd={occupancyRangeEnd}
                  excludeBookingId={editing?.id}
                  highlightDate={checkInDate ? format(checkInDate, "yyyy-MM-dd") : undefined}
                  compact
                  petType="cani"
                />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary/70" />
                <span>Occupa capacità</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary/20" />
                <span>Soggiorno</span>
              </div>
              <span>Singole: {totalSingole} · Doppie: {totalDoppie}</span>
            </div>
            {allBookings && (
              <OccupancyGrid
                bookings={allBookings}
                occupancyDays={occupancyDays}
                totalSingole={totalSingole}
                totalDoppie={totalDoppie}
                rangeStart={occupancyRangeStart}
                rangeEnd={occupancyRangeEnd}
                excludeBookingId={editing?.id}
                highlightDate={checkInDate ? format(checkInDate, "yyyy-MM-dd") : undefined}
                compact
                petType={petType}
              />
            )}
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOccupancyModalOpen(false)}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}