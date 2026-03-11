import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, addDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { PaymentSplitConfig } from "@/hooks/usePaymentSplits";

interface PreventivoData {
  booking_number: string;
  client: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  };
  booking_cats?: { cat?: { name: string } }[];
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  deposit_amount: number;
  price_breakdown?: any;
  created_at: string;
  pet_type?: string | null;
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
  iban?: string | null;
  bank_name?: string | null;
  iban_holder?: string | null;
  bollo_amount?: number;
  preventivo_validity_days?: number;
  pet_type?: string;
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

export async function generatePreventivoPDF(
  preventivo: PreventivoData,
  tenant: TenantData,
  paymentSplits: PaymentSplitConfig[],
  stayCalcType: string,
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

  // ── Computed values ──
  const createdDate = format(parseISO(preventivo.created_at), "dd/MM/yyyy", { locale: it });
  const validityDays = tenant.preventivo_validity_days ?? 5;
  const validUntil = format(addDays(parseISO(preventivo.created_at), validityDays), "dd/MM/yyyy", { locale: it });
  const clientName = `${preventivo.client.first_name} ${preventivo.client.last_name}`;
  const petNames = preventivo.booking_cats
    ?.map(bc => bc.cat?.name)
    .filter(Boolean)
    .join(", ") ?? "";
  const petLabel = preventivo.pet_type === "cani" ? "Nome del cane" :
                   (preventivo.pet_type === "entrambi" ? "Nome dei pet" : "Nome del gatto");

  // ── Totals (pre-calculate for payment section) ──
  const breakdown = preventivo.price_breakdown;
  const seasonTotal = breakdown?.seasonPeriods?.reduce((s: number, p: any) => s + Number(p.total), 0) ?? Number(preventivo.total_amount);
  const extrasTotal = breakdown?.extraServices?.reduce((s: number, e: any) => s + Number(e.total), 0) ?? 0;
  const discountTotal = breakdown?.discounts?.reduce((s: number, d: any) => s + Number(d.amount), 0) ?? 0;
  const bolloUnitAmount = Number(tenant.bollo_amount ?? 2);
  const bolloAmount = bolloUnitAmount * (paymentSplits.length || 1);
  const subTotal = seasonTotal + extrasTotal - discountTotal;
  const grandTotal = subTotal + bolloAmount;

  // ══════════════════════════════════════════════
  // STEP 1: Calculate signature block height (fixed at bottom above footer)
  // ══════════════════════════════════════════════
  const footerStartY = pageHeight - 25; // footer area
  const signatureBlockHeight = 40;
  const signatureStartY = footerStartY - 8 - signatureBlockHeight;

  // ══════════════════════════════════════════════
  // STEP 2: Header - Logo centered with name below
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

  // Tenant name next to logo, vertically centered with logo, with spacing
  const nameX = logoBase64 ? margin + logoSize + 6 : margin;
  const nameCenterY = logoBase64 ? y + logoSize / 2 + 1 : y + 8;
  doc.setFontSize(13);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.text(tenant.name, nameX, nameCenterY);

  // Preventivo number + client info top-right, starting at logo vertical midpoint
  const rightInfoY = logoBase64 ? y + logoSize / 2 - 3 : y + 5;
  doc.setFontSize(10);
  doc.setTextColor(...lightGray);
  doc.text(`Preventivo: ${preventivo.booking_number}`, pageWidth - margin, rightInfoY, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "normal");
  doc.text(`Intestato a: ${clientName}`, pageWidth - margin, rightInfoY + 7, { align: "right" });
  doc.text(`${petLabel}: ${petNames}`, pageWidth - margin, rightInfoY + 13, { align: "right" });

  y = (logoBase64 ? y + logoSize : y + 15) + 5;

  // ── Separator ──
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // ── Dates below separator ──
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "normal");
  doc.text(`Data emissione: ${createdDate}`, margin, y);
  doc.text(`Valido fino al: ${validUntil}`, pageWidth - margin, y, { align: "right" });
  y += 12;

  // ══════════════════════════════════════════════
  // STEP 3: Services table (dynamic body)
  // ══════════════════════════════════════════════
  const tableBody: any[][] = [];

  if (breakdown?.seasonPeriods?.length) {
    breakdown.seasonPeriods.forEach((period: any) => {
      const fromDate = format(parseISO(period.fromDate), "dd/MM/yyyy");
      const toDate = format(parseISO(period.toDate), "dd/MM/yyyy");
      const desc = `Soggiorno dal: ${fromDate} al: ${toDate}`;
      const numCats = preventivo.booking_cats?.length ?? 1;
      const unitLabel = stayCalcType === "notti" ? "notti" : "gg";
      const pricePerDay = period.total > 0 && period.days > 0
        ? (period.total / (period.days * numCats))
        : 0;
      tableBody.push([
        desc,
        `€ ${pricePerDay.toFixed(2)}`,
        `${period.days} ${unitLabel}`,
        String(numCats),
        `€ ${Number(period.total).toFixed(2)}`,
      ]);
    });
  } else {
    const checkInFormatted = format(parseISO(preventivo.check_in_date), "dd/MM/yyyy");
    const checkOutFormatted = format(parseISO(preventivo.check_out_date), "dd/MM/yyyy");
    const numCats = preventivo.booking_cats?.length ?? 1;
    const unitLabel = stayCalcType === "notti" ? "notti" : "gg";
    tableBody.push([
      `Soggiorno dal: ${checkInFormatted} al: ${checkOutFormatted}`,
      `€ ${(Number(preventivo.total_amount) / numCats).toFixed(2)}`,
      `- ${unitLabel}`,
      String(numCats),
      `€ ${Number(preventivo.total_amount).toFixed(2)}`,
    ]);
  }

  // Extra services
  if (breakdown?.extraServices?.length) {
    breakdown.extraServices.forEach((extra: any) => {
      const tariffType = extra.tariff_type || extra.tariffType || "";
      let qtyLabel: string;
      if (tariffType === "extra_km") {
        qtyLabel = `${extra.quantity ?? 1} km`;
      } else if (tariffType === "extra_giornaliero") {
        qtyLabel = `${extra.quantity ?? 1} gg`;
      } else if (tariffType === "extra_una_tantum") {
        qtyLabel = `${extra.quantity ?? 1} v`;
      } else {
        qtyLabel = String(extra.quantity ?? 1);
      }
      tableBody.push([
        extra.name,
        `€ ${Number(extra.unitCost || extra.fixedCost || 0).toFixed(2)}`,
        qtyLabel,
        "1",
        `€ ${Number(extra.total).toFixed(2)}`,
      ]);
    });
  }

  autoTable(doc, {
    startY: y,
    head: [["DESCRIZIONE SERVIZIO", "PREZZO UNIT.", "Q.TÀ", "PETS", "TOTALE"]],
    body: tableBody,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: primaryColor,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 25 },
      2: { halign: "center", cellWidth: 20 },
      3: { halign: "center", cellWidth: 15 },
      4: { halign: "right", cellWidth: 25 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Totals ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);

  const totalsData: [string, string][] = [];
  totalsData.push(["Totale servizi", `€ ${subTotal.toFixed(2)}`]);
  if (discountTotal > 0) {
    totalsData.push(["Sconti", `- € ${discountTotal.toFixed(2)}`]);
  }
  if (bolloAmount > 0) {
    totalsData.push(["Imposta di bollo", `€ ${bolloAmount.toFixed(2)}`]);
  }
  totalsData.push(["Totale soggiorno", `€ ${grandTotal.toFixed(2)}`]);

  totalsData.forEach(([label, value], idx) => {
    const isLast = idx === totalsData.length - 1;
    if (isLast) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
    }
    doc.text(label, pageWidth - margin - 60, y);
    doc.text(value, pageWidth - margin, y, { align: "right" });
    y += isLast ? 8 : 6;
  });

  // ══════════════════════════════════════════════
  // STEP 4: Payment modalities (flows after body with spacing)
  // ══════════════════════════════════════════════
  y += 8;

  if (paymentSplits.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...accentColor);
    doc.text("Modalità di pagamento", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);

    paymentSplits.forEach((split) => {
      const amount = Math.round(grandTotal * Number(split.percentage)) / 100;
      let line = `• € ${amount.toFixed(2)} - ${split.label}, pari al ${Number(split.percentage)}% del totale`;

      if (split.payment_moment === "caparra") {
        line += `, da versare entro il ${validUntil}`;
      }

      if (split.payment_method_note) {
        line += ` ${split.payment_method_note}`;
      }

      if (split.payment_moment === "caparra" && preventivo.booking_number) {
        const petNamesShort = petNames || "—";
        line += ` indicando come causale: "prev. ${preventivo.booking_number} - ${petLabel.toLowerCase().replace("nome del ", "")} ${petNamesShort}"`;
      }

      const splitLines = doc.splitTextToSize(line, contentWidth - 5);
      doc.text(splitLines, margin + 3, y);
      y += splitLines.length * 5 + 3;
    });

    y += 2;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Tutte le somme extra non preventivate ma concordate durante il soggiorno, saranno pagate in fase di check-out.", margin, y);
    y += 5;
    doc.text("Il mancato pagamento della caparra entro la data di scadenza, comporta l'annullamento del preventivo.", margin, y);
    y += 10;
  }

  // ══════════════════════════════════════════════
  // STEP 5: Signature block (fixed at bottom, right-aligned)
  // ══════════════════════════════════════════════
  let sigY = signatureStartY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text("Grazie per la fiducia!", margin, sigY);
  sigY += 10;
  doc.text("Per accettazione", pageWidth - margin - 15, sigY, { align: "right" });
  sigY += 9;
  doc.text("Data: _______________", pageWidth - margin - 15, sigY, { align: "right" });
  sigY += 9;
  doc.text("Firma: _______________", pageWidth - margin - 15, sigY, { align: "right" });

  // ══════════════════════════════════════════════
  // STEP 5: Footer (always at very bottom)
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

  if (tenant.iban) {
    let ibanLine = `IBAN: ${tenant.iban}`;
    if (tenant.bank_name) ibanLine += ` presso ${tenant.bank_name}`;
    if (tenant.iban_holder) ibanLine += ` intestato a: ${tenant.iban_holder}`;
    doc.text(ibanLine, pageWidth / 2, footerY + 8, { align: "center" });
  }

  // ── Download ──
  doc.save(`Preventivo_${preventivo.booking_number}.pdf`);
}
