// src/Payment/handleDownloadInvoice.js
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FALLBACK_LOGO_URL =
  "https://static.vecteezy.com/system/resources/previews/026/513/688/original/data-analytics-logo-design-growth-arrow-logo-design-for-data-finance-investment-vector.jpg";

const INR = (n) =>
  `INR ${(Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

async function toDataURL(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
function getImageTypeFromDataURL(dataURL) {
  if (!dataURL) return "PNG";
  const m = /^data:image\/(png|jpeg|jpg)/i.exec(dataURL);
  const t = (m?.[1] || "png").toLowerCase();
  return t === "jpg" ? "JPEG" : t.toUpperCase();
}
function numberToWordsINRClient(n) {
  const num = Math.round(Number(n) || 0);
  if (!num) return "INR Zero Only";
  return `${INR(num)} Only`;
}

/** Build & download PDF from the unified payload */
async function buildAndDownloadPDF(payload, { preview = false, filenameFallback = "Invoice" } = {}) {
  const clinic = payload?.clinic || {};
  const invoice = payload?.invoice || {};
  const patient = payload?.patient || {};
  const bank = payload?.bank || {};
  const declaration = payload?.declaration || "";
  const signature = payload?.signature || "";
  const jurisdiction = payload?.jurisdiction || "";

  // --- new live totals from API (fallbacks kept) ---
  const overall = Number(payload?.billing?.overallTotal ?? invoice.totalAmount ?? 0);
  const paid = Number(payload?.billing?.paidTotal ?? 0);
  const due = Math.max(0, Number(payload?.billing?.dueTotal ?? overall - paid));
  const dueInWords = numberToWordsINRClient(due);

  const services = Array.isArray(invoice.services) ? invoice.services : [];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const headerH = 42;
  const CONTENT_MT = 10;
  const footerH = 14;

  const logoUrl = clinic.logoUrl || clinic.logo || FALLBACK_LOGO_URL;
  const logoDataURL = await toDataURL(logoUrl);
  const logoType = getImageTypeFromDataURL(logoDataURL);

  const drawHeader = () => {
    doc.setFillColor(4, 120, 210); // sky-600
    doc.rect(0, 0, pageW, 16, "F");

    if (logoDataURL) doc.addImage(logoDataURL, logoType, pageW - 14 - 24, 8, 24, 24);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(String(clinic.name || "Clinic / Hospital"), marginX, 10);

    let hy = 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(45, 52, 54);
    [
      String(clinic.address || ""),
      `GSTIN: ${clinic.gstin || "-"}`,
      `State: ${clinic.stateName || "-"} (Code: ${clinic.stateCode || "-"})`,
      clinic.email ? `Email: ${clinic.email}` : "",
      clinic.phone ? `Phone: ${clinic.phone}` : "",
    ]
      .filter(Boolean)
      .forEach((line) => {
        doc.text(line, marginX, hy);
        hy += 5;
      });

    doc.setDrawColor(4, 120, 210);
    doc.setTextColor(4, 120, 210);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.roundedRect(pageW - marginX - 36, 18, 36, 8, 2, 2);
    doc.text("TAX INVOICE", pageW - marginX - 34, 24);
  };

  const drawFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    const pageStr = `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${doc.internal.getNumberOfPages()}`;
    doc.text(pageStr, pageW - marginX, pageH - 6, { align: "right" });
    if (clinic.email) doc.text(clinic.email, marginX, pageH - 6);
  };

  const addHeaderFooterToAll = () => {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      drawHeader();
      drawFooter();
    }
  };

  // Buyer + Invoice Details
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33);
  doc.setFontSize(11);

  const colW = 95;
  let y = headerH;

  doc.text("Buyer (Bill to)", marginX, y);
  doc.setDrawColor(220);
  doc.roundedRect(marginX, y + 2, colW, 34, 2, 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.setFontSize(9);

  let by = y + 9;
  [
    `${patient.name || "Patient"}  (P.ID: ${patient.p_id || patient.caseId || "-"})`,
    `Phone: ${patient.phone || "N/A"}`,
    `Case Type: ${patient.caseType || "-"}`,
    `State: ${patient.stateName || "-"} (Code: ${patient.stateCode || "-"})`,
    `Place of Supply: ${patient.placeOfSupply || patient.stateName || "-"}`,
  ].forEach((l) => {
    doc.text(l, marginX + 3, by);
    by += 5;
  });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(33);
  doc.text("Invoice Details", marginX + colW + 6, y);
  doc.setDrawColor(220);
  doc.roundedRect(marginX + colW + 6, y + 2, colW - 6, 34, 2, 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.setFontSize(9);

  let my = y + 10;
  const invoiceMeta = [
    ["Invoice No:", invoice.number || filenameFallback],
    ["Dated:", invoice.date || "-"],
    ["Invoice Status:", (invoice.status || "-").toString().toUpperCase()],
  ];
  invoiceMeta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(k, marginX + colW + 9, my);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), marginX + colW + 42, my);
    my += 6;
  });

  // Line items
  const head = ["Description of Service", "HSN/SAC", "Amount (INR)"];
  const body =
    services.length > 0
      ? services.map((it) => [it.name || "-", it.hsn || "9993", INR(it.cost || 0)])
      : [["Consultation / Therapy", "9993", INR(overall)]];

  autoTable(doc, {
    head: [head],
    body,
    startY: y + CONTENT_MT + 24,
    margin: { left: marginX, right: marginX, top: headerH, bottom: footerH },
    styles: { font: "helvetica", fontSize: 9, lineColor: 220, lineWidth: 0.1 },
    headStyles: { fillColor: [240, 246, 255], textColor: 30, halign: "left" },
    bodyStyles: { textColor: 40 },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    columnStyles: { 2: { halign: "right" } },
    theme: "striped",
    didDrawPage: () => {
      drawHeader();
      drawFooter();
    },
  });

  let afterTableY = doc.lastAutoTable.finalY + 6;

  // Amount Due (words) + Totals (Overall/Paid/Due)
  const rightBoxW = 64;
  const rightX = pageW - marginX - rightBoxW;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(33);
  doc.setFontSize(10);
  doc.text("Amount Due (in words)", marginX, afterTableY);
  const words = doc.splitTextToSize(dueInWords, pageW - marginX * 2 - rightBoxW - 6);
  doc.setDrawColor(220);
  doc.roundedRect(
    marginX,
    afterTableY + 2,
    pageW - marginX * 2 - rightBoxW - 6,
    words.length * 5 + 6,
    2,
    2
  );
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.setFontSize(9);
  doc.text(words, marginX + 3, afterTableY + 8);

  const totY = afterTableY + 2;
  doc.setDrawColor(220);
  doc.roundedRect(rightX, totY, rightBoxW, 42, 2, 2);
  doc.setFontSize(9);
  doc.setTextColor(70);

  let ty = totY + 8;
  [
    ["Overall", INR(overall)],
    ["Paid to Date", INR(paid)],
    ["Amount Due", INR(due)],
  ].forEach(([k, v], i) => {
    doc.setFont("helvetica", i === 2 ? "bold" : "normal");
    doc.text(k, rightX + 4, ty);
    doc.text(v, rightX + rightBoxW - 4, ty, { align: "right" });
    ty += 12;
  });

  afterTableY += Math.max(words.length * 5 + 10, 46) + 6;

  // Page break if needed
  if (afterTableY > pageH - footerH - 60) {
    doc.addPage();
    drawHeader();
    afterTableY = headerH + 6;
  }

  // Declaration + Bank
  const colW2 = (pageW - marginX * 2 - 6) / 2;
  const leftX = marginX;
  const rightColX = marginX + colW2 + 6;

  if (declaration) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(33);
    doc.text("Declaration", leftX, afterTableY);
    const decl = doc.splitTextToSize(declaration, colW2);
    doc.setDrawColor(220);
    doc.roundedRect(leftX, afterTableY + 2, colW2, decl.length * 5 + 8, 2, 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.setFontSize(9);
    doc.text(decl, leftX + 3, afterTableY + 8);
  }

  {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(33);
    doc.text("Company's Bank Details", rightColX, afterTableY);
    const bankLines = [
      `A/c Holder: ${bank.accountHolder || "-"}`,
      `Bank: ${bank.bankName || "-"}`,
      `A/c No.: ${bank.accountNumber || "-"}`,
      `Branch & IFSC: ${bank.branch || "-"} & ${bank.ifsc || "-"}`,
    ];
    const bankH = bankLines.length * 6 + 8;
    doc.setDrawColor(220);
    doc.roundedRect(rightColX, afterTableY + 2, colW2, bankH, 2, 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.setFontSize(9);
    let by2 = afterTableY + 10;
    bankLines.forEach((l) => {
      doc.text(l, rightColX + 3, by2);
      by2 += 6;
    });

    const declHeight = declaration ? doc.splitTextToSize(declaration, colW2).length * 5 + 16 : 0;
    afterTableY += Math.max(declHeight, bankH + 10) + 10;
  }

  if (afterTableY > pageH - footerH - 30) {
    doc.addPage();
    drawHeader();
    afterTableY = headerH + 10;
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33);
  doc.text(signature || `for ${clinic.name || "Clinic"}`, pageW - marginX - 60, afterTableY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text("Authorised Signatory", pageW - marginX - 60, afterTableY + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.setFontSize(9);
  if (jurisdiction) {
    doc.text(`SUBJECT TO ${jurisdiction} JURISDICTION`, marginX, afterTableY + 6);
  }

  addHeaderFooterToAll();

  const safeNumber = String(invoice.number || filenameFallback).replace(/[^\w-]/g, "_");
  const fileName = `Invoice_${safeNumber}.pdf`;
  if (preview) {
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  } else {
    doc.save(fileName);
  }
}

/** Public: Download/preview invoice BY CASE (optionally lock to a billing) */
export async function handleDownloadInvoiceByCase(caseId, { billingId, preview = false } = {}) {
  const token = localStorage.getItem("token");
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const q = billingId ? `?billingId=${billingId}` : "";
  try {
    const { data } = await axios.get(`${baseURL}/invoice/by-case/${caseId}${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await buildAndDownloadPDF(data, { preview, filenameFallback: caseId });
  } catch (err) {
    console.error(err);
    alert("Failed to download invoice: " + (err?.response?.data?.error || err.message));
  }
}
