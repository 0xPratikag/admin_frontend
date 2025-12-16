// src/Payment/handleDownloadInvoice.js
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

import LOCAL_LOGO from "../../assets/logo.jpeg";

// ✅ jsPDF default fonts don't support ₹ properly, so use "INR" + numbers
const MONEY = (n) =>
  (Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const INR = (n) => `INR ${MONEY(n)}`;

function getImageTypeFromDataURL(dataURL) {
  if (!dataURL) return "PNG";
  const m = /^data:image\/(png|jpeg|jpg)/i.exec(dataURL);
  const t = (m?.[1] || "png").toLowerCase();
  return t === "jpg" ? "JPEG" : t.toUpperCase();
}

async function dataURLFromAsset(assetUrl) {
  const res = await fetch(assetUrl);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function amountInWordsSimple(n) {
  const num = Math.round(Number(n) || 0);
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero Rupees Only";

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = num % 100;

  let words = "";

  if (crore > 0)
    words +=
      (crore < 10 ? ones[crore] : tens[Math.floor(crore / 10)] + " " + ones[crore % 10]) + " Crore ";
  if (lakh > 0)
    words += (lakh < 10 ? ones[lakh] : tens[Math.floor(lakh / 10)] + " " + ones[lakh % 10]) + " Lakh ";
  if (thousand > 0)
    words +=
      (thousand < 10 ? ones[thousand] : tens[Math.floor(thousand / 10)] + " " + ones[thousand % 10]) +
      " Thousand ";
  if (hundred > 0) words += ones[hundred] + " Hundred ";

  if (remainder > 0) {
    if (remainder < 10) words += ones[remainder];
    else if (remainder < 20) words += teens[remainder - 10];
    else
      words += tens[Math.floor(remainder / 10)] + (remainder % 10 ? " " + ones[remainder % 10] : "");
  }

  return words.trim() + " Rupees Only";
}

function buildUpiUri({ upiId, upiName, amount, note, merchantCode }) {
  if (!upiId) return "";
  const params = new URLSearchParams();
  params.set("pa", upiId);
  if (upiName) params.set("pn", upiName);
  if (merchantCode) params.set("mc", merchantCode);

  if (amount != null && !Number.isNaN(Number(amount))) {
    params.set("am", Number(amount).toFixed(2));
  }

  params.set("cu", "INR");
  if (note) params.set("tn", note);

  return `upi://pay?${params.toString()}`;
}

async function generateQrDataUrl(text) {
  if (!text) return null;
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 400,
      errorCorrectionLevel: "H",
    });
  } catch {
    return null;
  }
}

function fmtDateIN(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-GB"); // dd/mm/yyyy
}

function resolveServicePeriod(invoice) {
  // Preferred: direct string field from backend
  const direct =
    invoice?.servicePeriod || invoice?.validity || invoice?.service_period || invoice?.service_validity;

  if (direct && String(direct).trim()) return String(direct).trim();

  // If backend sends start/end
  const start = invoice?.periodStart || invoice?.serviceStart || invoice?.startDate || invoice?.service_from;
  const end = invoice?.periodEnd || invoice?.serviceEnd || invoice?.endDate || invoice?.service_to;

  if (start || end) {
    const s = fmtDateIN(start) || "-";
    const e = fmtDateIN(end) || "-";
    return `${s} - ${e}`;
  }

  // Fallback: invoice.date -> +30 days
  const invDateRaw = invoice?.dateISO || invoice?.bill_date || invoice?.date;
  const invDate = new Date(invDateRaw || Date.now());
  if (Number.isNaN(invDate.getTime())) return "";

  const endDate = new Date(invDate);
  endDate.setDate(endDate.getDate() + 30);
  return `${fmtDateIN(invDate)} - ${fmtDateIN(endDate)}`;
}

async function buildAndDownloadPDF(payload, { preview = false, filenameFallback = "Invoice" } = {}) {
  const clinic = payload?.clinic || {};
  const invoice = payload?.invoice || {};
  const patient = payload?.patient || {};
  const bank = payload?.bank || {};

  const declaration =
    payload?.declaration ||
    "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";
  const signature = payload?.signature || `for ${clinic.name || "Clinic"}`;
  const jurisdiction = payload?.jurisdiction || "";

  const overall = Number(payload?.billing?.overallTotal ?? invoice.totalAmount ?? 0);

  const wordsTotal = amountInWordsSimple(overall);
  const services = Array.isArray(invoice.services) ? invoice.services : [];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const usableW = pageW - marginX * 2;

  // ===== LIGHT (B/W FRIENDLY) COLOR PALETTE (SUBTLE) =====
const C_PRIMARY  = [8, 34, 74];
const C_PRIMARY2 = [41, 74, 128];
const C_INK      = [27, 46, 89];    // #1B2E59
const C_BORDER   = [205, 214, 226];
const C_ROW_ALT  = [243, 248, 255];



  // ===== LIGHT (B/W FRIENDLY) COLOR PALETTE (SUBTLE) =====
// const C_PRIMARY  = [185, 212, 248];
// const C_PRIMARY2 = [225, 238, 255];
// const C_INK      = [18, 40, 85];
// const C_BORDER   = [205, 214, 226];
// const C_ROW_ALT  = [243, 248, 255];


  // ===== PAGE LAYOUT HELPERS (AUTO 2+ PAGES) =====
  const HEADER_H = 35;
  const FOOTER_SAFE = 16; // reserve bottom area
  const CONTENT_TOP = 42;

  // Preload logo once (important for multi-page)
  let logoDataURL = null;
  let logoType = "JPEG";
  try {
    logoDataURL = await dataURLFromAsset(LOCAL_LOGO);
    logoType = getImageTypeFromDataURL(logoDataURL);
  } catch {
    /* ignore */
  }

  function drawHeaderBar() {
    doc.setFillColor(...C_PRIMARY);
    doc.rect(0, 0, pageW, HEADER_H, "F");

    doc.setFillColor(...C_PRIMARY2);
    doc.rect(0, 0, pageW, 28, "F");

    // Logo - top right
    if (logoDataURL) {
      const logoW = 24;
      const logoH = 18;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageW - marginX - logoW - 2, 8, logoW + 4, logoH + 4, 2, 2, "F");
      doc.addImage(logoDataURL, logoType, pageW - marginX - logoW, 10, logoW, logoH);
    }

// Clinic Name (WHITE)
doc.setFont("helvetica", "bold");
doc.setFontSize(18);
doc.setTextColor(255, 255, 255);
doc.text(String("INDIA THERAPY CENTRE").toUpperCase(), marginX, 19);

// subtitle (WHITE)
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
doc.text(`By ${clinic.name || ""}`, marginX, 24);


    // Invoice number (small) - right
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    // doc.text(`Invoice: ${String(invoice.number || filenameFallback)}`, pageW - marginX, 24, { align: "right" });

    doc.setTextColor(40, 40, 40);
  }

  function drawFooter() {
    const footerY = pageH - 10;

    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 4, pageW - marginX, footerY - 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);

    if (jurisdiction) {
      doc.text(`Subject to ${jurisdiction} Jurisdiction`, marginX, footerY);
    }

    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")}`, pageW / 2, footerY, {
      align: "center",
    });

    if (clinic.email) {
      doc.text(clinic.email, pageW - marginX, footerY, { align: "right" });
    }
  }

  let currentY = CONTENT_TOP;

  function ensureSpace(requiredH) {
    const limit = pageH - FOOTER_SAFE;
    if (currentY + requiredH > limit) {
      // close current page
      drawFooter();
      doc.addPage();
      drawHeaderBar();
      currentY = CONTENT_TOP;
    }
  }

  // ===== FIRST PAGE HEADER =====
  drawHeaderBar();

  // ===== CLINIC & INVOICE INFO =====
  const infoY = 42;
  const infoLeftW = usableW * 0.55;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C_INK);
  doc.text("FROM", marginX, infoY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  const clinicInfo = [
    clinic.address || "",
    clinic.phone ? `Phone: ${clinic.phone}` : "",
    clinic.email ? `Email: ${clinic.email}` : "",
    clinic.gstin ? `GSTIN: ${clinic.gstin}` : "",
    clinic.stateName ? `State: ${clinic.stateName} (${clinic.stateCode || "-"})` : "",
  ].filter(Boolean);

  let y = infoY + 5;
  clinicInfo.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, infoLeftW - 5);
    wrapped.forEach((l) => {
      doc.text(l, marginX, y);
      y += 4;
    });
  });

  // Right side - meta box
  const metaX = marginX + infoLeftW + 8;
  const metaW = usableW - infoLeftW - 8;
  const metaH = 46; // fits Service Period

  doc.setFillColor(245, 248, 252);
  doc.roundedRect(metaX, infoY - 4, metaW, metaH, 2, 2, "FD");

  const statusText = String((invoice.status || "PAID").toUpperCase());
  const servicePeriod = resolveServicePeriod(invoice);

  const metaData = [
    { label: "Invoice No", value: String(invoice.number || filenameFallback) },
    { label: "Date", value: String(invoice.date || "-") },
    { label: "Service Period", value: servicePeriod || "-" },
    {
      label: "Status",
      value: statusText,
      color: statusText === "PAID" ? [34, 139, 34] : [255, 140, 0],
    },
    { label: "Total", value: INR(overall) },
  ];

  y = infoY + 2;
  metaData.forEach((item) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    doc.setTextColor(120, 120, 120);
    doc.text(item.label, metaX + 4, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.7);
    if (item.color) doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    else doc.setTextColor(40, 40, 40);

    if (item.label === "Service Period") {
      const maxW = metaW - 40;
      const wrapped = doc.splitTextToSize(String(item.value), maxW);
      doc.text(wrapped, metaX + metaW - 4, y, { align: "right" });
      y += wrapped.length > 1 ? 10 : 9.5;
      return;
    }

    doc.text(String(item.value), metaX + metaW - 4, y, { align: "right" });
    y += 9.5;
  });

  // ===== BILL TO =====
 const billToY = infoY + metaH + 0; // ✅ 5mm upar


  doc.setFillColor(252, 252, 253);
  doc.roundedRect(marginX, billToY, usableW, 32, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C_INK);
  doc.text("BILL TO", marginX + 4, billToY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  const col1X = marginX + 4;
  const col2X = marginX + usableW / 2;

  const patientCol1 = [
    `Patient: ${patient.name || "-"}`,
    patient.phone ? `Phone: ${patient.phone}` : "",
    `Patient ID: ${patient.p_id || "-"}`,
  ].filter(Boolean);

  const patientCol2 = [
    `Case ID: ${patient.caseId || "-"}`,
    `State: ${patient.stateName || "-"} (${patient.stateCode || "-"})`,
    `Place of Supply: ${patient.placeOfSupply || patient.stateName || "-"}`,
  ].filter(Boolean);

  y = billToY + 11;
  patientCol1.forEach((line) => {
    doc.text(line, col1X, y);
    y += 5;
  });

  y = billToY + 11;
  patientCol2.forEach((line) => {
    doc.text(line, col2X, y);
    y += 5;
  });

  // ===== ITEMS TABLE =====
  const tableY = billToY + 34;

  const head = [["Description of Services", "Per Session Cost", "Total Sessions", "Amount"]];

  const body =
    services.length > 0
      ? services.map((s) => {
          const sessions =
            Number(s.total_sessions) ||
            Number(s.totalSessions) ||
            Number(s.qty) ||
            Number(s.quantity) ||
            1;

          const perSession =
            s.perSessionCost != null
              ? Number(s.perSessionCost)
              : s.rate != null
              ? Number(s.rate)
              : s.amount != null
              ? Number(s.amount) / sessions
              : s.cost != null
              ? Number(s.cost) / sessions
              : 0;

          const amount =
            s.amount != null
              ? Number(s.amount)
              : s.cost != null
              ? Number(s.cost)
              : perSession * sessions;

          const desc = s.description || s.name || "-";

          return [desc, MONEY(perSession), String(sessions), MONEY(amount)];
        })
      : [["Consultation / Therapy", MONEY(overall), "1", MONEY(overall)]];

  autoTable(doc, {
    head,
    body,
    startY: tableY,
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      lineWidth: 0.2,
      lineColor: C_BORDER,
      cellPadding: 3,
      valign: "middle",
    },
    headStyles: {
      fillColor: C_PRIMARY,
     textColor: [255, 255, 255], // ✅ white
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: {
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: C_ROW_ALT,
    },
    columnStyles: {
      0: { cellWidth: 83, halign: "left" },
      1: { cellWidth: 35, halign: "right" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 37, halign: "right", fontStyle: "bold", textColor: C_INK },
    },

    // ✅ If table goes to next page, draw header/footer again
    didDrawPage: () => {
      drawHeaderBar();
      drawFooter();
    },
  });

  // After table, set currentY for next blocks
  currentY = doc.lastAutoTable.finalY + 0.5;

  // ===== TOTAL SECTION =====
  const totalBoxH = 10;
  const totalLabelW = usableW - 31;

  ensureSpace(totalBoxH + 8);

  doc.setFillColor(...C_PRIMARY);
  doc.rect(marginX, currentY, usableW, totalBoxH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
doc.setTextColor(255, 255, 255); // ✅ white
doc.text("TOTAL", marginX + totalLabelW - 5, currentY + 7, { align: "right" });
doc.text(INR(overall), pageW - marginX - 6, currentY + 7, { align: "right" });

  currentY += totalBoxH + 5;

  // ===== AMOUNT IN WORDS =====
  const wordsBoxH = 14;

  ensureSpace(wordsBoxH + 8);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, currentY, usableW, wordsBoxH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Amount in Words", marginX + 4, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C_INK);
  const wordsWrapped = doc.splitTextToSize(wordsTotal, usableW - 8);
  doc.text(wordsWrapped, marginX + 4, currentY + 10);

  currentY += wordsBoxH + 3;

  // ===== BANK DETAILS & QR CODE =====
  const showPaymentBox = bank?.showOnInvoice !== false;
  if (showPaymentBox) {
    const allowQr = bank?.enableUpiQr !== false && !!bank?.upiId;
    const upiNote =
      bank?.upiNote || `Invoice ${invoice.number || ""} - ${patient.name || ""} (PID:${patient.p_id || "-"})`;

    const upiUri = allowQr
      ? buildUpiUri({
          upiId: bank.upiId,
          upiName: bank.upiName || bank.accountHolder || clinic.name,
          amount: overall,
          note: upiNote,
          merchantCode: bank.upiMerchantCode || "",
        })
      : "";

    const qrDataUrl = allowQr ? await generateQrDataUrl(upiUri) : null;

    const bankBoxH = 50;
    const qrSize = 36;

    ensureSpace(bankBoxH + 8);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, usableW, bankBoxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C_INK);
    doc.text("PAYMENT DETAILS", marginX + 4, currentY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);

    const bankDetails = [
      `Account Holder: ${bank.accountHolder || clinic.name || "-"}`,
      `Bank Name: ${bank.bankName || "-"}`,
      `Account Number: ${bank.accountNumber || "-"}`,
      `IFSC Code: ${bank.ifsc || "-"}`,
      `Branch: ${bank.branch || "-"}`,
      bank.upiId ? `UPI ID: ${bank.upiId}` : "",
    ].filter(Boolean);

    y = currentY + 11;
    const bankTextWidth = qrDataUrl ? usableW - qrSize - 16 : usableW - 8;

    bankDetails.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, bankTextWidth);
      wrapped.forEach((l) => {
        doc.text(l, marginX + 4, y);
        y += 4.5;
      });
    });

    if (qrDataUrl) {
      const qrX = pageW - marginX - qrSize - 4;
      const qrY = currentY + 4;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...C_INK);
      doc.setLineWidth(0.4);
      doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, "FD");

      const type = getImageTypeFromDataURL(qrDataUrl);
      doc.addImage(qrDataUrl, type, qrX, qrY, qrSize, qrSize);

      doc.setFillColor(...C_PRIMARY);
      doc.roundedRect(qrX - 2, qrY + qrSize + 3, qrSize + 4, 6, 1, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
doc.setTextColor(255, 255, 255);
doc.text("SCAN TO PAY", qrX + qrSize / 2, qrY + qrSize + 7, { align: "center" });

    }

    currentY += bankBoxH + 8;
  }

  // ===== DECLARATION & SIGNATURE =====
  const declH = 18;
  const sigW = 60;
  const declW = usableW - sigW - 4;

  ensureSpace(declH + 6);

  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(...C_BORDER);
  doc.roundedRect(marginX, currentY, declW, declH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Declaration", marginX + 4, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const declWrapped = doc.splitTextToSize(declaration, declW - 8);
  doc.text(declWrapped, marginX + 4, currentY + 10);

  const sigX = marginX + declW + 4;

  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(...C_BORDER);
  doc.roundedRect(sigX, currentY, sigW, declH, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(signature, sigX + 4, currentY + declH - 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C_INK);
  doc.text("Authorized Signatory", sigX + 4, currentY + declH - 4);

  // ===== FINAL FOOTER (ALWAYS) =====
  drawFooter();

  const safeNumber = String(invoice.number || filenameFallback).replace(/[^\w-]/g, "_");
  const fileName = `Invoice_${safeNumber}.pdf`;

  if (preview) {
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  } else {
    doc.save(fileName);
  }
}

/** Public: Download/preview invoice BY CASE */
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

/** Public: Download/preview FINAL invoice BY BILL */
export async function handleDownloadFinalInvoiceByBill(billId, { preview = false } = {}) {
  const token = localStorage.getItem("token");
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  try {
    const { data } = await axios.get(`${baseURL}/invoices/final/by-bill/${billId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await buildAndDownloadPDF(data, { preview, filenameFallback: billId });
  } catch (err) {
    console.error(err);
    alert("Failed to download invoice: " + (err?.response?.data?.error || err.message));
  }
}
