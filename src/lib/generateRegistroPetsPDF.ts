import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";

interface RegistryRow {
  cat_name: string;
  client_name: string;
  microchip?: string | null;
  check_in_date: string;
  check_out_date?: string | null;
  reason?: string | null;
  cats?: { breed?: string | null; gender?: string | null; pet_type?: string | null } | null;
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
  pet_type?: string | null;
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

export async function generateRegistroPetsPDF(
  entries: RegistryRow[],
  tenant: TenantData,
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const primaryColor: [number, number, number] = [60, 60, 60];
  const accentColor: [number, number, number] = [44, 62, 80];
  const lightGray: [number, number, number] = [200, 200, 200];

  const generatedOn = format(new Date(), "dd/MM/yyyy HH:mm");
  const showPetType = tenant.pet_type === "entrambi";

  const logoBase64 = tenant.logo_url ? await loadImageAsBase64(tenant.logo_url) : null;
  const logoSize = 14;
  const headerHeight = 30;
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
    doc.text("Registro Pets", pageWidth - margin, 12, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generato il ${generatedOn}`, pageWidth - margin, 17, { align: "right" });

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

  const head: string[] = [];
  if (showPetType) head.push("Tipo");
  head.push("Pet", "Cliente", "Microchip", "Razza", "Sesso", "Check-in", "Check-out", "Stato", "Motivo uscita");

  const body = entries.map((entry) => {
    const row: string[] = [];
    if (showPetType) {
      row.push(entry.cats?.pet_type === "cani" ? "Cane" : entry.cats?.pet_type === "gatti" ? "Gatto" : "—");
    }
    row.push(
      entry.cat_name,
      entry.client_name,
      entry.microchip || "—",
      entry.cats?.breed || "—",
      entry.cats?.gender === "M" ? "Maschio" : entry.cats?.gender === "F" ? "Femmina" : "—",
      format(parseISO(entry.check_in_date), "dd/MM/yyyy"),
      entry.check_out_date ? format(parseISO(entry.check_out_date), "dd/MM/yyyy") : "—",
      entry.check_out_date ? "Uscito" : "Presente",
      entry.reason || "—",
    );
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
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Pagina ${i} di ${totalPages}`, pageWidth - margin, pageHeight - footerHeight + 10, { align: "right" });
  }

  doc.save(`Registro_Pets_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
