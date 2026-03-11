import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO, differenceInDays } from "date-fns";
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
  tenant_id?: string;
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
  id?: string;
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

  // ── Fetch full cat data ──
  const catIds = booking.booking_cats?.map(bc => bc.cat_id || bc.cat?.id).filter(Boolean) as string[] ?? [];
  let fullCats: any[] = [];
  if (catIds.length > 0) {
    const { data } = await supabase
      .from("cats")
      .select("*")
      .in("id", catIds);
    fullCats = data ?? [];
  }

  // ── Fetch extra price lists for tenant ──
  const tenantId = (tenant as any).id ?? booking.tenant_id;
  let extraPriceLists: any[] = [];
  if (tenantId) {
    const { data } = await supabase
      .from("price_lists")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("tariff_type", ["extra_giornaliero", "extra_km", "extra_una_tantum"])
      .eq("is_active", true)
      .order("name");
    extraPriceLists = data ?? [];
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

  // Cat names for header
  const catNames = fullCats.map(c => c.name).join(", ") || "—";

  // ══════════════════════════════════════════════
  // HEADER
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

  // Top-right: booking number + cat names
  const rightInfoY = logoBase64 ? y + logoSize / 2 - 3 : y + 5;
  doc.setFontSize(10);
  doc.setTextColor(...lightGray);
  doc.text(`Prenotazione: ${booking.booking_number}`, pageWidth - margin, rightInfoY, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "normal");
  const petLabel = booking.pet_type === "cani" ? "Cani" : "Gatti";
  doc.text(`${petLabel}: ${catNames}`, pageWidth - margin, rightInfoY + 7, { align: "right" });

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
  // OWNER DATA
  // ══════════════════════════════════════════════
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "normal");

  const fieldLabel = (label: string, value: string | null | undefined, x: number, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, x, yPos);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    if (value) {
      doc.text(value, x + labelWidth + 2, yPos);
    }
    // If no value, leave blank (no line)
  };

  fieldLabel("Proprietario:", clientName, margin, y);
  fieldLabel("CF:", fullClient?.fiscal_code, pageWidth / 2, y);
  y += 7;

  fieldLabel("Indirizzo:", fullClient?.address, margin, y);
  y += 7;

  fieldLabel("Cell.:", fullClient?.phone, margin, y);
  fieldLabel("E-mail:", fullClient?.email, pageWidth / 2, y);
  y += 10;

  // ══════════════════════════════════════════════
  // PET TABLE (all pets in single table body)
  // ══════════════════════════════════════════════
  const tableRows = fullCats.map((cat: any) => {
    const genderLabel = cat?.gender === "M" ? "Maschio" : cat?.gender === "F" ? "Femmina" : cat?.gender ?? "";
    const birthDate = cat?.birth_date ? format(parseISO(cat.birth_date), "dd/MM/yyyy") : "";
    const neuteredLabel = cat?.is_neutered === true ? "Sì" : cat?.is_neutered === false ? "No" : "";
    const needsDouble = cat?.needs_double_cage ? "Sì" : "No";
    const petTypeLabel = cat?.pet_type === "cani" ? "Cane" : cat?.pet_type === "gatti" ? "Gatto" : "";
    return [
      cat?.name ?? "",
      petTypeLabel,
      cat?.microchip ?? "",
      genderLabel,
      birthDate,
      cat?.breed ?? "",
      cat?.color ?? "",
      cat?.weight_kg ? `${cat.weight_kg}` : "",
      neuteredLabel,
      needsDouble,
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push(["", "", "", "", "", "", "", "", "", ""]);
  }

  const showTipoCol = tenant.pet_type === "entrambi";
  const headers = showTipoCol
    ? [["Nome", "Tipo", "Microchip", "Sesso", "Data di nascita", "Razza", "Colore", "Peso (kg)", "Sterilizzato/a", "Casetta doppia"]]
    : [["Nome", "Microchip", "Sesso", "Data di nascita", "Razza", "Colore", "Peso (kg)", "Sterilizzato/a", "Casetta doppia"]];

  const bodyRows = showTipoCol
    ? tableRows
    : tableRows.map(r => [r[0], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9]]);

  const colStyles: any = showTipoCol
    ? {
        0: { cellWidth: 20, fontStyle: "bold" },
        1: { cellWidth: 14, halign: "center" },
        2: { cellWidth: 26 },
        3: { halign: "center", cellWidth: 14 },
        4: { halign: "center", cellWidth: 20 },
        5: { cellWidth: "auto" },
        6: { cellWidth: 16 },
        7: { halign: "center", cellWidth: 14 },
        8: { halign: "center", cellWidth: 18 },
        9: { halign: "center", cellWidth: 18 },
      }
    : {
        0: { cellWidth: 22, fontStyle: "bold" },
        1: { cellWidth: 28 },
        2: { halign: "center", cellWidth: 15 },
        3: { halign: "center", cellWidth: 22 },
        4: { cellWidth: "auto" },
        5: { cellWidth: 18 },
        6: { halign: "center", cellWidth: 16 },
        7: { halign: "center", cellWidth: 20 },
        8: { halign: "center", cellWidth: 20 },
      };

  autoTable(doc, {
    startY: y,
    head: headers,
    body: bodyRows,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: primaryColor,
    },
    columnStyles: colStyles,
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // ══════════════════════════════════════════════
  // PECULIARITÀ E SEGNALAZIONI (writable box)
  // ══════════════════════════════════════════════
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.text("Peculiarità e segnalazioni", margin, y);
  y += 5;

  const lineHeight = 6;

  if (fullCats.length <= 1) {
    // Single cat or none: one box with 4 lines
    const boxHeight = lineHeight * 4 + 4;
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "S");

    // Pre-fill existing notes if any
    const cat = fullCats[0];
    const existingNotes: string[] = [];
    if (cat?.medical_notes) existingNotes.push(`Mediche: ${cat.medical_notes}`);
    if (cat?.dietary_notes) existingNotes.push(`Alimentari: ${cat.dietary_notes}`);
    if (cat?.behavioral_notes) existingNotes.push(`Comportamentali: ${cat.behavioral_notes}`);

    if (existingNotes.length > 0) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      let noteY = y + 5;
      existingNotes.forEach(note => {
        const split = doc.splitTextToSize(note, contentWidth - 6);
        doc.text(split[0] || "", margin + 3, noteY);
        noteY += lineHeight;
      });
    }

    // Draw lines inside box for writing
    doc.setDrawColor(220, 220, 220);
    for (let i = 1; i <= 4; i++) {
      const lineY = y + 2 + lineHeight * i;
      doc.line(margin + 3, lineY, pageWidth - margin - 3, lineY);
    }

    y += boxHeight + 4;
  } else {
    // Multiple cats: one box per cat with 2 lines each
    for (const cat of fullCats) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...accentColor);
      doc.text(cat.name || "", margin + 3, y + 4);

      const boxHeight = lineHeight * 2 + 6;
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "S");

      // Pre-fill notes
      const existingNotes: string[] = [];
      if (cat?.medical_notes) existingNotes.push(`Mediche: ${cat.medical_notes}`);
      if (cat?.dietary_notes) existingNotes.push(`Alimentari: ${cat.dietary_notes}`);
      if (cat?.behavioral_notes) existingNotes.push(`Comportamentali: ${cat.behavioral_notes}`);

      if (existingNotes.length > 0) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        let noteY = y + 4;
        existingNotes.slice(0, 2).forEach(note => {
          const split = doc.splitTextToSize(note, contentWidth - 30);
          doc.text(split[0] || "", margin + 25, noteY);
          noteY += lineHeight;
        });
      }

      // Lines inside box
      doc.setDrawColor(220, 220, 220);
      for (let i = 1; i <= 2; i++) {
        const lineY = y + 4 + lineHeight * i;
        doc.line(margin + 3, lineY, pageWidth - margin - 3, lineY);
      }

      y += boxHeight + 2;
    }
    y += 2;
  }

  y += 8;

  // ══════════════════════════════════════════════
  // VETERINARIO DI FIDUCIA (single row: nome + telefono)
  // ══════════════════════════════════════════════
  doc.setFontSize(10);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.text("Veterinario di fiducia", margin, y);
  y += 2;

  const vetBoxHeight = lineHeight + 4;
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, vetBoxHeight, 2, 2, "S");

  // Labels inside box on same line
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Nome:", margin + 3, y + 5);
  doc.text("Telefono:", margin + contentWidth / 2, y + 5);

  // Single line
  doc.setDrawColor(220, 220, 220);
  doc.line(margin + 3, y + 2 + lineHeight, pageWidth - margin - 3, y + 2 + lineHeight);

  y += vetBoxHeight + 4;

  // ══════════════════════════════════════════════
  // STAY PERIOD
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
  // EXTRA SERVICES (from price list, with checkboxes)
  // ══════════════════════════════════════════════
  if (extraPriceLists.length > 0) {
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(...accentColor);
    doc.setFont("helvetica", "bold");
    doc.text("Servizi Extra Disponibili", margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...primaryColor);

    const colWidth = contentWidth / 3;

    extraPriceLists.forEach((extra, idx) => {
      const col = idx % 3;
      const x = margin + col * colWidth;

      // Checkbox square
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.3);
      doc.rect(x, y - 3, 3.5, 3.5, "S");

      // Extra name + price
      let priceLabel = "";
      if (extra.tariff_type === "extra_giornaliero") {
        priceLabel = `€ ${Number(extra.price_per_day ?? 0).toFixed(2)}/gg`;
      } else if (extra.tariff_type === "extra_km") {
        priceLabel = `€ ${Number(extra.extra_km_cost ?? 0).toFixed(2)}/km`;
        if (extra.fixed_cost) priceLabel = `€ ${Number(extra.fixed_cost).toFixed(2)} + ${priceLabel}`;
      } else {
        priceLabel = `€ ${Number(extra.fixed_cost ?? extra.price_per_day ?? 0).toFixed(2)}`;
      }

      doc.text(`${extra.name}  (${priceLabel})`, x + 5, y, { maxWidth: colWidth - 8 });

      if (col === 2 || idx === extraPriceLists.length - 1) {
        y += 5;
      }
    });

    y += 3;
  }


  // ══════════════════════════════════════════════
  // SIGNATURE BLOCK (dynamic, below content but above footer)
  // ══════════════════════════════════════════════
  const footerTopY = pageHeight - 30;
  // Ensure signature is at least at current y, but not overlapping footer
  const sigStartY = Math.max(y + 5, footerTopY - 25);

  let sigY = sigStartY;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "italic");
  doc.text("Con la firma il proprietario certifica di accettare il regolamento e i requisiti sanitari.", margin, sigY);
  sigY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text("Data: _______________", pageWidth - margin - 15, sigY, { align: "right" });
  sigY += 9;
  doc.text("Firma del Proprietario: ___________________________", pageWidth - margin - 15, sigY, { align: "right" });

  // ══════════════════════════════════════════════
  // FOOTER (without IBAN/bank)
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
