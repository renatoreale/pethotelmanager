import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  caparra: "Caparra",
  saldo: "Saldo",
  extra: "Extra",
  rimborso: "Rimborso",
  manuale: "Manuale",
  gestione_pratica: "Gestione pratica",
};

interface PaymentRow {
  clientName: string;
  booking_number: string;
  payment_date: string;
  payment_type: string;
  methodName: string;
  amount: number;
  notes?: string | null;
  paidSoFar?: number;
  residuoAfterPayment?: number;
}

interface TenantData {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cap?: string | null;
  city?: string | null;
  logo_url?: string | null;
  partita_iva?: string | null;
  pec?: string | null;
}

async function loadImageAsBase64(url: string, maxSize = 200): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(blobUrl);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(null); };
      img.src = blobUrl;
    });
  } catch {
    return null;
  }
}

interface ColumnFlags {
  showImportoTransazione: boolean;
  showTotaliPrenotazione: boolean;
}

export async function generatePagamentiPDF(
  rows: PaymentRow[],
  tenant: TenantData,
  filtersSummary?: string | null,
  columns?: ColumnFlags,
  fileName?: string,
): Promise<void> {
  const showImportoTransazione = columns?.showImportoTransazione ?? true;
  const showTotaliPrenotazione = columns?.showTotaliPrenotazione ?? true;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const primaryColor: [number, number, number] = [60, 60, 60];
  const accentColor: [number, number, number] = [44, 62, 80];
  const lightGray: [number, number, number] = [200, 200, 200];

  const generatedOn = format(new Date(), "dd/MM/yyyy HH:mm");
  const logoBase64 = tenant.logo_url ? await loadImageAsBase64(tenant.logo_url) : null;
  const logoSize = 14;
  const headerHeight = filtersSummary ? 34 : 30;
  const footerHeight = 20;

  const drawHeader = () => {
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", margin, 8, logoSize, logoSize);
      } catch { /* skip */ }
    }
    const nameX = logoBase64 ? margin + logoSize + 5 : margin;
    const nameY = logoBase64 ? 8 + logoSize / 2 + 1 : 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...accentColor);
    doc.text(tenant.name, nameX, nameY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("Report Pagamenti", pageWidth - margin, 12, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generato il ${generatedOn}`, pageWidth - margin, 17, { align: "right" });

    if (filtersSummary) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(filtersSummary, pageWidth - margin, 22, { align: "right" });
    }

    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.5);
    doc.line(margin, headerHeight - 4, pageWidth - margin, headerHeight - 4);
  };

  const drawFooter = () => {
    const footerY = pageHeight - footerHeight + 6;
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");

    const addressParts: string[] = [tenant.name];
    if (tenant.address) addressParts.push(tenant.address);
    if (tenant.cap && tenant.city) addressParts.push(`${tenant.cap} ${tenant.city}`);
    else if (tenant.city) addressParts.push(tenant.city);
    else if (tenant.cap) addressParts.push(tenant.cap);
    doc.text(addressParts.join(" • "), pageWidth / 2, footerY, { align: "center" });

    const contactParts: string[] = [];
    if (tenant.phone) contactParts.push(`Tel: ${tenant.phone}`);
    if (tenant.email) contactParts.push(`Email: ${tenant.email}`);
    if (tenant.pec) contactParts.push(`PEC: ${tenant.pec}`);
    if (tenant.partita_iva) contactParts.push(`P.IVA: ${tenant.partita_iva}`);
    if (contactParts.length) {
      doc.text(contactParts.join(" • "), pageWidth / 2, footerY + 4, { align: "center" });
    }
  };

  // L'ordinamento (per cliente/prenotazione/data) e' gia' applicato dal chiamante.
  const sortedRows = rows;
  // Vista aggregata (una riga per prenotazione): niente Data/Tipo/Modalita'/Note,
  // che sono attributi della singola transazione.
  const isAggregatedView = showTotaliPrenotazione && !showImportoTransazione;

  const head = ["Cliente", "Prenotazione"];
  if (!isAggregatedView) head.push("Data", "Tipo", "Modalità");
  if (showImportoTransazione) head.push("Importo transazione");
  if (showTotaliPrenotazione) head.push("Tot. pagato pren.", "Residuo pren.");
  if (!isAggregatedView) head.push("Note");

  const moneyColumnIndexes: number[] = [];
  let colIdx = 2 + (isAggregatedView ? 0 : 3);
  if (showImportoTransazione) moneyColumnIndexes.push(colIdx++);
  if (showTotaliPrenotazione) { moneyColumnIndexes.push(colIdx++, colIdx++); }

  const body = sortedRows.map((r) => {
    const isRimborso = r.payment_type === "rimborso";
    const row = [r.clientName, r.booking_number];
    if (!isAggregatedView) {
      row.push(format(parseISO(r.payment_date), "dd/MM/yyyy"), TYPE_LABELS[r.payment_type] ?? r.payment_type, r.methodName);
    }
    if (showImportoTransazione) row.push(`${isRimborso ? "-" : "+"}€ ${r.amount.toFixed(2)}`);
    if (showTotaliPrenotazione) {
      row.push(r.paidSoFar != null ? `€ ${r.paidSoFar.toFixed(2)}` : "—");
      row.push(r.residuoAfterPayment != null ? `€ ${r.residuoAfterPayment.toFixed(2)}` : "—");
    }
    if (!isAggregatedView) row.push(r.notes || "—");
    return row;
  });

  autoTable(doc, {
    startY: headerHeight,
    margin: { left: margin, right: margin, top: headerHeight, bottom: footerHeight },
    head: [head],
    body,
    didDrawPage: () => {
      drawHeader();
      drawFooter();
    },
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
    columnStyles: Object.fromEntries(moneyColumnIndexes.map(i => [i, { halign: "right" as const }])),
  });

  let finalY = (doc as any).lastAutoTable.finalY;
  if (finalY + 16 > pageHeight - footerHeight) {
    doc.addPage();
    drawHeader();
    drawFooter();
    finalY = headerHeight;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);

  if (isAggregatedView) {
    const totalResiduo = sortedRows.reduce((s, r) => s + (r.residuoAfterPayment ?? 0), 0);
    doc.text(`Prenotazioni riportate: ${sortedRows.length}`, margin, finalY + 8);
    doc.text(`Totale residuo: € ${totalResiduo.toFixed(2)}`, pageWidth - margin, finalY + 8, { align: "right" });
  } else {
    const totalPaid = sortedRows
      .filter(r => r.payment_type !== "rimborso" && r.payment_type !== "gestione_pratica")
      .reduce((s, r) => s + r.amount, 0);
    const totalRefunded = sortedRows
      .filter(r => r.payment_type === "rimborso")
      .reduce((s, r) => s + r.amount, 0);
    const netTotal = totalPaid - totalRefunded;
    doc.text(`Pagamenti riportati: ${sortedRows.length}`, margin, finalY + 8);
    doc.text(`Totale netto: € ${netTotal.toFixed(2)}`, pageWidth - margin, finalY + 8, { align: "right" });
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Pagina ${i} di ${totalPages}`, pageWidth - margin, pageHeight - footerHeight + 10, { align: "right" });
  }

  doc.save(fileName || `Report_Pagamenti_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
