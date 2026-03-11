import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface BookingData {
  id: string;
  booking_number: string;
  client_id: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number | null;
  notes: string | null;
  pet_type?: string | null;
  price_breakdown?: any;
  booking_cats?: { cat_id: string; cat?: { id: string; name: string } }[];
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  };
  appointments?: {
    id: string;
    appointment_type: "check_in" | "check_out";
    scheduled_at: string;
  }[];
}

interface TenantData {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cap?: string | null;
  city?: string | null;
  logo_url?: string | null;
  titolare_name?: string | null;
  partita_iva?: string | null;
  pec?: string | null;
  pet_type?: string;
  stay_calc_type?: string;
  count_checkin_day?: boolean;
  count_checkout_day?: boolean;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateModuloAffidoPDF(
  booking: BookingData,
  tenant: TenantData,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // ── Colors ──
  const primaryColor: [number, number, number] = [60, 60, 60];
  const accentColor: [number, number, number] = [44, 62, 80];
  const lightGray: [number, number, number] = [200, 200, 200];

  // ── Fetch full client data ──
  const { data: fullClient } = await supabase
    .from("clients")
    .select("*")
    .eq("id", booking.client_id)
    .single();

  // ── Fetch full cat data for each booking cat ──
  const catIds = booking.booking_cats?.map(bc => bc.cat_id || bc.cat?.id).filter(Boolean) as string[] ?? [];
  let fullCats: any[] = [];
  if (catIds.length > 0) {
    const { data } = await supabase
      .from("cats")
      .select("*")
      .in("id", catIds);
    fullCats = data ?? [];
  }

  // ── Stay calculation ──
  const stayCalcType = tenant.stay_calc_type ?? "notti";
  const countCheckinDay = tenant.count_checkin_day ?? true;
  const countCheckoutDay = tenant.count_checkout_day ?? true;
  const diff = differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date));
  let duration = diff;
  if (stayCalcType !== "notti") {
    duration = diff + 1;
    if (!countCheckinDay) duration -= 1;
    if (!countCheckoutDay) duration -= 1;
    duration = Math.max(0, duration);
  }
  const stayLabel = stayCalcType === "notti" ? "notti" : "gg";

  // ── Appointment times ──
  const checkInApt = booking.appointments?.find(a => a.appointment_type === "check_in");
  const checkOutApt = booking.appointments?.find(a => a.appointment_type === "check_out");
  const checkInTime = checkInApt?.scheduled_at?.includes("T")
    ? checkInApt.scheduled_at.split("T")[1]?.substring(0, 5) ?? ""
    : "";
  const checkOutTime = checkOutApt?.scheduled_at?.includes("T")
    ? checkOutApt.scheduled_at.split("T")[1]?.substring(0, 5) ?? ""
    : "";

  const clientName = fullClient
    ? `${fullClient.first_name} ${fullClient.last_name}`
    : (booking.client ? `${booking.client.first_name} ${booking.client.last_name}` : "—");

  // ══════════════════════════════════════════════
  // HEADER (same as preventivo)
  // ══════════════════════════════════════════════
  let logoBase64: string | null = null;
  if (tenant.logo_url) {
    logoBase64 = await loadImageAsBase64(tenant.logo_url);
  }

  const logoSize = 22;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, y, logoSize, logoSize);
    } catch { /* skip */ }
  }

  const nameX = logoBase64 ? margin + logoSize + 6 : margin;
  const nameCenterY = logoBase64 ? y + logoSize / 2 + 1 : y + 8;
  doc.setFontSize(13);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.text(tenant.name, nameX, nameCenterY);

  // "Modulo di Affido" top-right
  const rightInfoY = logoBase64 ? y + logoSize / 2 - 3 : y + 5;
  doc.setFontSize(10);
  doc.setTextColor(...lightGray);
  doc.text(`Prenotazione: ${booking.booking_number}`, pageWidth - margin, rightInfoY, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "normal");
  doc.text(`Intestato a: ${clientName}`, pageWidth - margin, rightInfoY + 7, { align: "right" });

  y = (logoBase64 ? y + logoSize : y + 15) + 5;

  // ── Separator ──
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // ── Title ──
  doc.setFontSize(16);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.text("Modulo di Affido", pageWidth / 2, y, { align: "center" });
  y += 12;

  // ══════════════════════════════════════════════
  // OWNER DATA SECTION
  // ══════════════════════════════════════════════
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "normal");

  const fieldLabel = (label: string, value: string, x: number, yPos: number, maxWidth?: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, x, yPos);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    const val = value || "___________________________";
    if (maxWidth) {
      doc.text(val, x + labelWidth + 2, yPos, { maxWidth });
    } else {
      doc.text(val, x + labelWidth + 2, yPos);
    }
  };

  // Row 1: Proprietario + CF
  fieldLabel("Proprietario:", clientName, margin, y);
  fieldLabel("CF:", fullClient?.fiscal_code ?? "", pageWidth / 2, y);
  y += 7;

  // Row 2: Indirizzo + CAP + Comune
  const address = fullClient?.address ?? "";
  fieldLabel("Indirizzo:", address, margin, y);
  y += 7;

  // Row 3: Cell + Email
  fieldLabel("Cell.:", fullClient?.phone ?? "", margin, y);
  fieldLabel("E-mail:", fullClient?.email ?? "", pageWidth / 2, y);
  y += 10;

  // ══════════════════════════════════════════════
  // CAT TABLE(S) - one per cat
  // ══════════════════════════════════════════════
  for (let ci = 0; ci < Math.max(fullCats.length, 1); ci++) {
    const cat = fullCats[ci];

    if (ci > 0) y += 4;

    // Cat name header
    const petTypeLabel = booking.pet_type === "cani" ? "Cane" : "Gatto";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...accentColor);
    doc.text(`${petTypeLabel}: ${cat?.name ?? "—"}`, margin, y);
    y += 6;

    // Info table
    const genderLabel = cat?.gender === "M" ? "M" : cat?.gender === "F" ? "F" : cat?.gender ?? "—";
    const birthDate = cat?.birth_date ? format(parseISO(cat.birth_date), "dd/MM/yyyy") : "—";
    const neuteredLabel = cat?.is_neutered ? "Sì" : "No";

    autoTable(doc, {
      startY: y,
      head: [["Microchip", "Sesso", "Data nascita", "Razza", "Colore", "Peso", "Sterilizzato"]],
      body: [[
        cat?.microchip ?? "—",
        genderLabel,
        birthDate,
        cat?.breed ?? "—",
        cat?.color ?? "—",
        cat?.weight_kg ? `${cat.weight_kg} kg` : "—",
        neuteredLabel,
      ]],
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: accentColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: primaryColor,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { halign: "center", cellWidth: 15 },
        2: { halign: "center", cellWidth: 22 },
        3: { cellWidth: "auto" },
        4: { cellWidth: 20 },
        5: { halign: "center", cellWidth: 18 },
        6: { halign: "center", cellWidth: 22 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 3;

    // Notes section
    const notesLines: string[] = [];
    if (cat?.medical_notes) notesLines.push(`Note mediche: ${cat.medical_notes}`);
    if (cat?.dietary_notes) notesLines.push(`Note alimentari: ${cat.dietary_notes}`);
    if (cat?.behavioral_notes) notesLines.push(`Note comportamentali: ${cat.behavioral_notes}`);

    if (notesLines.length > 0) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      notesLines.forEach(line => {
        const split = doc.splitTextToSize(line, contentWidth);
        doc.text(split, margin, y);
        y += split.length * 4 + 1;
      });
      y += 2;
    }
  }

  y += 4;

  // ══════════════════════════════════════════════
  // STAY PERIOD SECTION
  // ══════════════════════════════════════════════
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(12);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.text("Periodo del Soggiorno", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "normal");

  const checkInFormatted = format(parseISO(booking.check_in_date), "dd/MM/yyyy");
  const checkOutFormatted = format(parseISO(booking.check_out_date), "dd/MM/yyyy");

  const stayLine = `Dal ${checkInFormatted}${checkInTime ? `  Orario: ${checkInTime}` : ""}    Al ${checkOutFormatted}${checkOutTime ? `  Orario: ${checkOutTime}` : ""}    Totale: ${duration} ${stayLabel}`;
  doc.text(stayLine, margin, y);
  y += 10;

  // ══════════════════════════════════════════════
  // EXTRAS SECTION
  // ══════════════════════════════════════════════
  const breakdown = booking.price_breakdown;
  const extras = breakdown?.extraServices ?? [];

  if (extras.length > 0) {
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(12);
    doc.setTextColor(...accentColor);
    doc.setFont("helvetica", "bold");
    doc.text("Servizi Extra", margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "normal");

    extras.forEach((extra: any) => {
      const total = Number(extra.total ?? 0).toFixed(2);
      doc.text(`• ${extra.name}: € ${total}`, margin + 3, y);
      y += 5;
    });

    y += 3;
  }

  // ══════════════════════════════════════════════
  // TOTALE
  // ══════════════════════════════════════════════
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Totale soggiorno:", margin, y);
  doc.text(`€ ${Number(booking.total_amount ?? 0).toFixed(2)}`, pageWidth - margin, y, { align: "right" });
  y += 10;

  // ══════════════════════════════════════════════
  // BOOKING NOTES
  // ══════════════════════════════════════════════
  if (booking.notes) {
    doc.setFontSize(10);
    doc.setTextColor(...accentColor);
    doc.setFont("helvetica", "bold");
    doc.text("Note:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    const noteLines = doc.splitTextToSize(booking.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4.5 + 5;
  }

  // ══════════════════════════════════════════════
  // SIGNATURE BLOCK (fixed at bottom)
  // ══════════════════════════════════════════════
  const footerStartY = pageHeight - 25;
  const signatureStartY = footerStartY - 8 - 35;

  let sigY = signatureStartY;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "italic");
  doc.text("Con la firma il proprietario certifica di accettare il regolamento e i requisiti sanitari.", margin, sigY);
  sigY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text("Data: _______________", pageWidth - margin - 15, sigY, { align: "right" });
  sigY += 9;
  doc.text("Firma del Proprietario: ___________________________", pageWidth - margin - 15, sigY, { align: "right" });

  // ══════════════════════════════════════════════
  // FOOTER (same as preventivo, without IBAN/bank)
  // ══════════════════════════════════════════════
  const footerY = pageHeight - 25;
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");

  const footerParts: string[] = [tenant.name];
  if (tenant.address) footerParts.push(tenant.address);
  if (tenant.cap && tenant.city) footerParts.push(`${tenant.cap} ${tenant.city}`);
  else if (tenant.city) footerParts.push(tenant.city);
  else if (tenant.cap) footerParts.push(tenant.cap);

  doc.text(footerParts.join(" • "), pageWidth / 2, footerY, { align: "center" });

  const contactParts: string[] = [];
  if (tenant.phone) contactParts.push(`Tel: ${tenant.phone}`);
  if (tenant.email) contactParts.push(`Email: ${tenant.email}`);
  if (tenant.pec) contactParts.push(`PEC: ${tenant.pec}`);
  if (tenant.partita_iva) contactParts.push(`P.IVA: ${tenant.partita_iva}`);

  if (contactParts.length) {
    doc.text(contactParts.join(" • "), pageWidth / 2, footerY + 4, { align: "center" });
  }

  // ── Download ──
  doc.save(`Modulo_Affido_${booking.booking_number}.pdf`);
}
