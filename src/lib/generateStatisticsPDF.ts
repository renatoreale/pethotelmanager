import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface MonthlyRow {
  label: string;
  preventivi: number;
  confermati: number;
  cancellati: number;
  revenue: number;
  petCount: number;
  conversionRate: number;
}

interface DistributionRow {
  name: string;
  value: number;
}

interface StatisticsData {
  kpis: {
    totPreventivi: number;
    totConfermati: number;
    totCancellati: number;
    totChiuse: number;
    conversionRate: string;
    cancellationRate: string;
    netRevenue: number;
    totalRefunds: number;
    totalPetStays: number;
    uniquePets: number;
    avgStayDays: string;
  };
  monthlyData: MonthlyRow[];
  statusDistribution: DistributionRow[];
  cageDistribution: DistributionRow[];
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

export async function generateStatisticsPDF(
  data: StatisticsData,
  tenant: TenantData,
  filtersSummary?: string | null,
  fileName?: string,
): Promise<void> {
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
    doc.text("Report Statistiche", pageWidth - margin, 12, { align: "right" });

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

  const ensureSpace = (neededHeight: number, currentY: number): number => {
    if (currentY + neededHeight > pageHeight - footerHeight) {
      doc.addPage();
      drawHeader();
      drawFooter();
      return headerHeight;
    }
    return currentY;
  };

  const { kpis } = data;
  const kpiRows: [string, string][] = [
    ["Totale Preventivi", String(kpis.totPreventivi)],
    ["Confermati", String(kpis.totConfermati)],
    ["Cancellati", String(kpis.totCancellati)],
    ["Chiuse", String(kpis.totChiuse)],
    ["Tasso Conversione", `${kpis.conversionRate}%`],
    ["Tasso Cancellazione", `${kpis.cancellationRate}%`],
    ["Ricavi Netti", `€ ${kpis.netRevenue.toFixed(2)}`],
    ["Rimborsi Totali", `€ ${kpis.totalRefunds.toFixed(2)}`],
    ["Pet Soggiornati", String(kpis.totalPetStays)],
    ["Pet Unici", String(kpis.uniquePets)],
    ["Durata Media Soggiorno (gg)", kpis.avgStayDays],
  ];

  let y = headerHeight;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...accentColor);
  doc.text("Indicatori", margin, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, top: headerHeight, bottom: footerHeight },
    body: kpiRows,
    theme: "plain",
    tableWidth: 110,
    didDrawPage: () => {
      drawHeader();
      drawFooter();
    },
    bodyStyles: {
      fontSize: 9,
      textColor: primaryColor,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
      1: { halign: "right", cellWidth: 50 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  y = ensureSpace(14, y);

  if (data.monthlyData.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...accentColor);
    doc.text("Andamento mensile", margin, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, top: headerHeight, bottom: footerHeight },
      head: [["Mese", "Preventivi", "Confermati", "Cancellati", "Ricavi netti", "Pet ospitati", "Conversione"]],
      body: data.monthlyData.map(m => [
        m.label,
        String(m.preventivi),
        String(m.confermati),
        String(m.cancellati),
        `€ ${m.revenue.toFixed(2)}`,
        String(m.petCount),
        `${m.conversionRate}%`,
      ]),
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
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  const buildDistributionTable = (title: string, rows: DistributionRow[], startY: number): number => {
    if (rows.length === 0) return startY;
    let cy = ensureSpace(14, startY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...accentColor);
    doc.text(title, margin, cy);
    cy += 3;

    const total = rows.reduce((s, r) => s + r.value, 0);
    autoTable(doc, {
      startY: cy,
      margin: { left: margin, right: margin, top: headerHeight, bottom: footerHeight },
      tableWidth: 110,
      head: [[title === "Distribuzione per stato" ? "Stato" : "Tipo", "N. prenotazioni", "%"]],
      body: rows.map(r => [r.name, String(r.value), total > 0 ? `${Math.round((r.value / total) * 100)}%` : "0%"]),
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
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
      },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  };

  y = buildDistributionTable("Distribuzione per stato", data.statusDistribution, y);
  buildDistributionTable("Tipo casetta richiesta", data.cageDistribution, y);

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Pagina ${i} di ${totalPages}`, pageWidth - margin, pageHeight - footerHeight + 10, { align: "right" });
  }

  doc.save(fileName || `Report_Statistiche_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
