// src/Payment/handleDownloadReceipt.js
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import LOCAL_LOGO from "../../assets/logo.jpeg";

// ✅ keep same as invoice (₹ font issue safe)
const MONEY = (n) =>
  (Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const INR = (n) => `INR ${MONEY(n)}`;

function safe(v, fallback = "—") {
  return v == null || v === "" ? fallback : String(v);
}

function looksLikeAlreadyFormattedDate(s) {
  return typeof s === "string" && /[A-Za-z]/.test(s) && s.length >= 8; // e.g. "16 Dec 2025"
}

function formatDisplayDate(v) {
  if (!v) return "-";
  if (looksLikeAlreadyFormattedDate(v)) return String(v);

  const dt = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(dt.getTime())) return String(v); // fallback as-is
  return dt.toLocaleDateString("en-GB"); // dd/mm/yyyy
}

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
    else words += tens[Math.floor(remainder / 10)] + (remainder % 10 ? " " + ones[remainder % 10] : "");
  }

  return words.trim() + " Rupees Only";
}

function pickReceiptNo({ invoice, txn }) {
  // ✅ receipt number is per-transaction receipt doc; backend is sending invoice.number like "ITC-RCPT-xxxx"
  return (
    invoice?.number ||
    txn?.receiptNo ||
    txn?.receipt_number ||
    txn?.internalTransactionId ||
    txn?._id ||
    "RECEIPT"
  );
}

function pickStatus({ invoice, txn }) {
  const s = (invoice?.status || txn?.status || "success").toString().toLowerCase();
  return s;
}

function computeBillingTotals(billing, invoice) {
  const overall =
    Number(billing?.overallTotal ?? invoice?.totalAmount ?? invoice?.total_amount ?? invoice?.summary?.grand_total ?? 0) ||
    0;
  const paid = Number(billing?.paidTotal ?? invoice?.paidAmount ?? invoice?.paid_amount ?? 0) || 0;
  const due =
    Number(billing?.dueTotal ?? invoice?.dueAmount ?? invoice?.due_amount ?? Math.max(0, overall - paid)) || 0;
  return { overall, paid, due };
}

async function buildReceiptPDF(payload, { preview = false } = {}) {
  const clinic = payload?.clinic || {};
  const invoice = payload?.invoice || {};
  const patient = payload?.patient || {};
  const txn = payload?.transaction || {};
  const billing = payload?.billing || {};
  const bank = payload?.bank || {};
  const jurisdiction = payload?.jurisdiction || "";
  const signature = payload?.signature || `for ${clinic.name || "Clinic"}`;

  const receiptNo = pickReceiptNo({ invoice, txn });
  const receiptDate = invoice?.date || txn?.paidAt || txn?.createdAt || new Date().toISOString();
  const status = pickStatus({ invoice, txn });

  const amount = Number(txn?.amount ?? invoice?.totalAmount ?? 0) || 0;
  const amountWords = safe(invoice?.amountInWords, amountInWordsSimple(amount));

  const services = Array.isArray(invoice?.services) ? invoice.services : [];
  const { overall, paid, due } = computeBillingTotals(billing, invoice);

  // ===== LIGHT (B/W FRIENDLY) COLOR PALETTE (SUBTLE) =====
  const C_PRIMARY = [8, 34, 74];
  const C_PRIMARY2 = [41, 74, 128];
  const C_INK = [27, 46, 89];
  const C_BORDER = [205, 214, 226];
  const C_ROW_ALT = [243, 248, 255];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const usableW = pageW - marginX * 2;

  // ===== PAGE LAYOUT HELPERS (AUTO 2+ PAGES) =====
  const HEADER_H = 35;
  const FOOTER_SAFE = 16;
  const CONTENT_TOP = 42;

  // Preload logo once
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

    // Logo
    if (logoDataURL) {
      const logoW = 24;
      const logoH = 18;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageW - marginX - logoW - 2, 8, logoW + 4, logoH + 4, 2, 2, "F");
      doc.addImage(logoDataURL, logoType, pageW - marginX - logoW, 10, logoW, logoH);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("PAYMENT RECEIPT", marginX, 19);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`By ${clinic.name || "Clinic"}`, marginX, 24);

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

    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")}`, pageW / 2, footerY, { align: "center" });

    if (clinic.email) {
      doc.text(clinic.email, pageW - marginX, footerY, { align: "right" });
    }
  }

  let currentY = CONTENT_TOP;

  function ensureSpace(requiredH) {
    const limit = pageH - FOOTER_SAFE;
    if (currentY + requiredH > limit) {
      drawFooter();
      doc.addPage();
      drawHeaderBar();
      currentY = CONTENT_TOP;
    }
  }

  // ===== FIRST PAGE HEADER =====
  drawHeaderBar();

  // ===== CLINIC & META =====
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

  // Right meta box
  const metaX = marginX + infoLeftW + 8;
  const metaW = usableW - infoLeftW - 8;
  const metaH = 50;

  doc.setFillColor(245, 248, 252);
  doc.roundedRect(metaX, infoY - 4, metaW, metaH, 2, 2, "FD");

  const statusUpper = String(status).toUpperCase();
  const statusColor =
    statusUpper === "SUCCESS" || statusUpper === "PAID"
      ? [34, 139, 34]
      : statusUpper === "FAILED"
      ? [220, 38, 38]
      : [255, 140, 0];

  const metaData = [
    { label: "Receipt No", value: safe(receiptNo, "-") },
    { label: "Date", value: formatDisplayDate(receiptDate) },
    { label: "Mode", value: safe(txn?.paymentMode, "-") },
    { label: "Provider", value: safe(txn?.provider, "-") },
    { label: "Status", value: statusUpper, color: statusColor },
    { label: "Receipt Amount", value: INR(amount) },
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

    doc.text(String(item.value), metaX + metaW - 4, y, { align: "right" });
    y += 8.2;
  });

  // ===== RECEIVED FROM =====
  const receivedY = infoY + metaH + 0;

  doc.setFillColor(252, 252, 253);
  doc.roundedRect(marginX, receivedY, usableW, 32, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C_INK);
  doc.text("RECEIVED FROM", marginX + 4, receivedY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  const col1X = marginX + 4;
  const col2X = marginX + usableW / 2;

  const patientCol1 = [
    `Patient: ${safe(patient.name, "-")}`,
    patient.phone ? `Phone: ${safe(patient.phone, "-")}` : "",
    `Patient ID: ${safe(patient.p_id, "-")}`,
  ].filter(Boolean);

  const txnRef = safe(txn?.internalTransactionId || txn?._id || "-", "-");

  const patientCol2 = [
    `Case ID: ${safe(patient.caseId, "-")}`,
    `Place of Supply: ${safe(patient.placeOfSupply || patient.stateName, "-")}`,
    `Txn Ref: ${txnRef}`,
  ].filter(Boolean);

  y = receivedY + 11;
  patientCol1.forEach((line) => {
    doc.text(line, col1X, y);
    y += 5;
  });

  y = receivedY + 11;
  patientCol2.forEach((line) => {
    doc.text(line, col2X, y);
    y += 5;
  });

  // ===== SERVICES TABLE (usually 1 row for receipt) =====
  const tableY = receivedY + 34;

  const head = [["Description", "Amount"]];
  const body =
    services.length > 0
      ? services.map((s) => {
          const desc = s?.name || s?.description || "Payment Receipt";
          const amt = Number(s?.cost ?? s?.amount ?? amount) || 0;
          return [desc, MONEY(amt)];
        })
      : [["Payment Received", MONEY(amount)]];

  autoTable(doc, {
    head,
    body,
    startY: tableY,
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 9,
      lineWidth: 0.2,
      lineColor: C_BORDER,
      cellPadding: 3,
      valign: "middle",
    },
    headStyles: {
      fillColor: C_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: { textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: C_ROW_ALT },
    columnStyles: {
      0: { cellWidth: usableW - 45, halign: "left" },
      1: { cellWidth: 45, halign: "right", fontStyle: "bold", textColor: C_INK },
    },
    didDrawPage: () => {
      drawHeaderBar();
      drawFooter();
    },
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // ===== TOTAL STRIP (Receipt Amount) =====
  ensureSpace(16);

  doc.setFillColor(...C_PRIMARY);
  doc.rect(marginX, currentY, usableW, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("RECEIPT AMOUNT", marginX + usableW - 55, currentY + 7, { align: "right" });
  doc.text(INR(amount), pageW - marginX - 6, currentY + 7, { align: "right" });

  currentY += 14;

  // ===== AMOUNT IN WORDS =====
  ensureSpace(20);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, usableW, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Amount in Words", marginX + 4, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C_INK);

  const wrappedWords = doc.splitTextToSize(String(amountWords), usableW - 8);
  doc.text(wrappedWords, marginX + 4, currentY + 10);

  currentY += 18;

  // ===== BILL SUMMARY (overall/paid/due) =====
  ensureSpace(26);

  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, usableW, 20, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C_INK);
  doc.text("BILL SUMMARY", marginX + 4, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  doc.text(`Bill Overall: ${INR(overall)}`, marginX + 4, currentY + 14);
  doc.text(`Paid Till Now: ${INR(paid)}`, marginX + usableW / 2, currentY + 14);
  doc.text(`Due: ${INR(due)}`, pageW - marginX - 4, currentY + 14, { align: "right" });

  currentY += 26;

  // ===== BANK DETAILS (OPTIONAL) =====
  const showBankBox = bank?.showOnReceipt !== false; // allow future toggle
  if (showBankBox) {
    const bankBoxH = 22;
    ensureSpace(bankBoxH + 8);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, usableW, bankBoxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C_INK);
    doc.text("BANK DETAILS", marginX + 4, currentY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);

    const bankLines = [
      `A/c Holder: ${safe(bank.accountHolder, clinic.name || "-")}`,
      `Bank: ${safe(bank.bankName, "-")}   IFSC: ${safe(bank.ifsc, "-")}`,
      `A/c No: ${safe(bank.accountNumber, "-")}   Branch: ${safe(bank.branch, "-")}`,
    ];

    let by = currentY + 11;
    bankLines.forEach((l) => {
      doc.text(l, marginX + 4, by);
      by += 4.5;
    });

    currentY += bankBoxH + 8;
  }

  // ===== SIGNATURE / NOTE =====
  ensureSpace(18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "This is a computer-generated receipt for a single transaction and does not require a signature.",
    marginX,
    currentY
  );

  currentY += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C_INK);
  doc.text(signature, marginX, currentY);

  // ===== FINAL FOOTER =====
  drawFooter();

  const safeNo = String(receiptNo || "RECEIPT").replace(/[^\w-]/g, "_");
  const safeTxn = String(txn?.internalTransactionId || txn?._id || "").replace(/[^\w-]/g, "_");
  const fileName = `Receipt_${safeNo}${safeTxn ? `_${safeTxn}` : ""}.pdf`;

  if (preview) {
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  } else {
    doc.save(fileName);
  }
}

/** Public: Download/preview ONE receipt BY TRANSACTION (1 txn = 1 receipt) */
export async function handleDownloadReceiptByTransaction(transactionId, { preview = false } = {}) {
  const token = localStorage.getItem("token");
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  try {
    const { data } = await axios.get(`${baseURL}/receipts/by-transaction/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // ✅ must contain single transaction in payload.transaction
    await buildReceiptPDF(data, { preview });
  } catch (err) {
    console.error(err);
    alert("Failed to download receipt: " + (err?.response?.data?.error || err.message));
  }
}
