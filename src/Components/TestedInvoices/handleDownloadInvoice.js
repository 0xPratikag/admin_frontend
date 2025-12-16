import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

// local fallback logo (optional)
import LOCAL_LOGO from "../../assets/logo.jpeg";

const INR = (n) =>
  `INR ${(Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function safe(v, fallback = "-") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function getImageTypeFromDataURL(dataURL) {
  if (!dataURL) return "PNG";
  const m = /^data:image\/(png|jpeg|jpg)/i.exec(dataURL);
  const t = (m?.[1] || "png").toLowerCase();
  return t === "jpg" ? "JPEG" : t.toUpperCase();
}

async function toDataURL(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function amountInWordsSimple(n) {
  const num = Math.round(Number(n) || 0);
  return `${INR(num)} Only`;
}

function buildUpiString({ upiId, upiName, amount, note }) {
  if (!upiId) return "";
  const params = new URLSearchParams();
  params.set("pa", upiId); // payee addr
  if (upiName) params.set("pn", upiName);
  if (amount != null) params.set("am", String(Number(amount || 0).toFixed(2)));
  params.set("cu", "INR");
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}

async function buildAndDownloadPDF(payload, { preview = false, filenameFallback = "Invoice" } = {}) {
  const clinic = payload?.clinic || {};
  const invoice = payload?.invoice || {};
  const patient = payload?.patient || {};
  const bank = payload?.bank || {};

  const overall = Number(payload?.billing?.overallTotal ?? invoice.totalAmount ?? 0);
  const paid = Number(payload?.billing?.paidTotal ?? 0);
  const due = Math.max(0, Number(payload?.billing?.dueTotal ?? overall - paid));

  const payAmountForQR = due > 0 ? due : overall; // agar due bacha hai toh due ka QR
  const wordsTotal = amountInWordsSimple(overall);

  const declaration =
    payload?.declaration ||
    "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";
  const signature = payload?.signature || `for ${safe(clinic.name, "Clinic")}`;
  const jurisdiction = payload?.jurisdiction || "";

  const services = Array.isArray(invoice.services) ? invoice.services : [];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const marginX = 12;
  const marginY = 12;
  const usableW = pageW - marginX * 2;

  // ===================== TITLE =====================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TAX INVOICE", pageW / 2, marginY, { align: "center" });

  // ===================== TOP BLOCKS =====================
  doc.setLineWidth(0.3);
  doc.setDrawColor(40);

  const leftW = Math.round(usableW * 0.64);
  const rightW = usableW - leftW;
  const topY = marginY + 4;
  const leftH = 52; // increased to avoid overlap
  const dividerY = topY + 28; // moved down so seller lines don't cut

  // LEFT rect (Seller + Buyer)
  doc.rect(marginX, topY, leftW, leftH);

  // RIGHT rect (Invoice meta)
  const rx = marginX + leftW;
  doc.rect(rx, topY, rightW, leftH);

  // Logo (top center inside left block)
  const logoBoxW = 18;
  const logoBoxH = 14;
  const logoX = marginX + leftW - logoBoxW - 3;
  const logoY = topY + 3;

  // Try clinic logoUrl, else local
  try {
    const logoUrl = clinic.logoUrl ? clinic.logoUrl : LOCAL_LOGO;
    const logoData = await toDataURL(logoUrl);
    doc.addImage(logoData, getImageTypeFromDataURL(logoData), logoX, logoY, logoBoxW, logoBoxH);
  } catch {
    // ignore
  }

  // ---------- SELLER ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(safe(clinic.name, "CLINIC"), marginX + 2, topY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const sellerLinesRaw = [
    safe(clinic.address, ""),
    clinic.gstin ? `GSTIN/UIN : ${clinic.gstin}` : "",
    (clinic.stateName || clinic.stateCode)
      ? `State Name : ${safe(clinic.stateName, "-")}, Code : ${safe(clinic.stateCode, "-")}`
      : "",
    clinic.email ? `Email : ${clinic.email}` : "",
    clinic.phone ? `Phone : ${clinic.phone}` : "",
    clinic.website ? `Website : ${clinic.website}` : "",
  ].filter(Boolean);

  // wrap seller lines to fit left block (avoid cutting with divider)
  let sy = topY + 11;
  const maxSellerW = leftW - 6 - logoBoxW; // leave space for logo
  for (const line of sellerLinesRaw) {
    const wrapped = doc.splitTextToSize(line, maxSellerW);
    for (const w of wrapped) {
      if (sy > dividerY - 3) break; // stop before divider
      doc.text(w, marginX + 2, sy);
      sy += 3.6;
    }
  }

  // divider
  doc.line(marginX, dividerY, marginX + leftW, dividerY);

  // ---------- BUYER ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Buyer (Bill to)", marginX + 2, dividerY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const buyerLines = [
    `Name : ${safe(patient.name)}`,
    patient.phone ? `Phone : ${patient.phone}` : "",
    patient.p_id ? `P.ID : ${patient.p_id}` : "", // ✅ Patient ID
    patient.caseId ? `Case ID : ${patient.caseId}` : "",
    (patient.stateName || patient.stateCode)
      ? `State Name : ${safe(patient.stateName, "-")}, Code : ${safe(patient.stateCode, "-")}`
      : "",
    `Place of Supply : ${safe(patient.placeOfSupply || patient.stateName)}`,
  ].filter(Boolean);

  let by = dividerY + 10;
  for (const line of buyerLines) {
    const wrapped = doc.splitTextToSize(line, leftW - 4);
    for (const w of wrapped) {
      if (by > topY + leftH - 3) break;
      doc.text(w, marginX + 2, by);
      by += 3.6;
    }
  }

  // ---------- RIGHT META ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);

  const labelX = rx + 2;
  const valueX = rx + 26;

  doc.text("Invoice No.", labelX, topY + 8);
  doc.text("Dated", labelX, topY + 14);
  doc.text("Status", labelX, topY + 20);
  doc.text("Total", labelX, topY + 26);

  doc.setFont("helvetica", "normal");
  doc.text(safe(invoice.number, filenameFallback), valueX, topY + 8);
  doc.text(safe(invoice.date, "-"), valueX, topY + 14);
  doc.text(safe(String(invoice.status || "").toUpperCase(), "PAID"), valueX, topY + 20);
  doc.text(INR(overall), valueX, topY + 26);

  // ===================== ITEMS TABLE =====================
  const itemsStartY = topY + leftH + 4;

  const head = [["Description", "HSN/SAC", "GST %", "Rate", "Qty", "Amount"]];

  const body =
    services.length > 0
      ? services.map((s) => {
          const cost = Number(s.cost ?? s.amount ?? 0);
          const qty = Number(s.qty ?? 1);
          const rate = qty > 0 ? cost / qty : cost;
          return [
            safe(s.name),
            safe(s.hsn, "9993"),
            s.gstRate != null ? `${s.gstRate}%` : "0%",
            INR(rate),
            String(qty),
            INR(cost),
          ];
        })
      : [[safe("Consultation / Therapy"), "9993", "0%", INR(overall), "1", INR(overall)]];

  autoTable(doc, {
    head,
    body,
    startY: itemsStartY,
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 8,
      lineWidth: 0.3,
      lineColor: 40,
      cellPadding: 1.6,
      valign: "middle",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: 0,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: Math.round(usableW * 0.46) }, // Description
      1: { cellWidth: 20, halign: "center" },       // HSN
      2: { cellWidth: 16, halign: "center" },       // GST
      3: { cellWidth: 22, halign: "right" },        // Rate
      4: { cellWidth: 14, halign: "center" },       // Qty
      5: { cellWidth: 24, halign: "right" },        // Amount
    },
    theme: "grid",
  });

  let y = doc.lastAutoTable.finalY;

  // ===================== TOTAL ROW =====================
  const totalH = 7;
  const amountColW = 24;
  const amountX = marginX + usableW - amountColW;

  doc.rect(marginX, y, usableW - amountColW, totalH);
  doc.rect(amountX, y, amountColW, totalH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Total", amountX - 4, y + 4.8, { align: "right" });
  doc.text(INR(overall), amountX + amountColW - 2, y + 4.8, { align: "right" });

  y += totalH + 3;

  // ===================== WORDS + BANK/QR =====================
  const leftBoxW = Math.round(usableW * 0.58);
  const gap = 2;
  const rightBoxW = usableW - leftBoxW - gap;

  // Left words box
  const wordsText = doc.splitTextToSize(wordsTotal, leftBoxW - 4);
  const wordsH = Math.max(16, 10 + wordsText.length * 4);

  doc.rect(marginX, y, leftBoxW, wordsH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Amount Chargeable (in words)", marginX + 2, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(wordsText, marginX + 2, y + 9);

  // Right bank + QR box (only if allowed)
  const showBank = bank?.showOnInvoice !== false;
  const showQR = showBank && bank?.enableUpiQr !== false && !!bank?.upiId;

  const bankX = marginX + leftBoxW + gap;
  const bankH = Math.max(wordsH, 34);
  doc.rect(bankX, y, rightBoxW, bankH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(showQR ? "Company Bank / UPI" : "Company Bank Details", bankX + 2, y + 5);

  // Split inside right box: left = details, right = QR
  const qrW = showQR ? 26 : 0;
  const detailW = rightBoxW - (showQR ? qrW + 2 : 0);

  // Bank details (clean key/value without spacing hacks)
  if (showBank) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);

    const lines = [
      ["A/c Holder", bank.accountHolder || clinic.name],
      ["Bank", bank.bankName],
      ["A/c No.", bank.accountNumber],
      ["IFSC", bank.ifsc],
      ["Branch", bank.branch],
      bank.upiId ? ["UPI ID", bank.upiId] : null,
    ].filter(Boolean);

    let ly = y + 9;
    for (const [k, v] of lines) {
      if (ly > y + bankH - 4) break;
      const text = `${k} : ${safe(v, "-")}`;
      const wrapped = doc.splitTextToSize(text, detailW - 4);
      for (const w of wrapped) {
        if (ly > y + bankH - 4) break;
        doc.text(w, bankX + 2, ly);
        ly += 3.5;
      }
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("—", bankX + 2, y + 11);
  }

  // QR code on right side
  if (showQR) {
    try {
      const upiString = buildUpiString({
        upiId: bank.upiId,
        upiName: bank.upiName || clinic.name,
        amount: payAmountForQR,
        note: bank.upiNote || "Fees",
      });

      const qrDataUrl = await QRCode.toDataURL(upiString, { margin: 0, width: 220 });
      const type = getImageTypeFromDataURL(qrDataUrl);

      const qrX = bankX + detailW + 2;
      const qrY = y + 8;
      doc.addImage(qrDataUrl, type, qrX, qrY, 24, 24);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Scan to Pay", qrX + 12, qrY + 27.5, { align: "center" });
    } catch {
      // if QR fails, ignore
    }
  }

  y += bankH + 3;

  // ===================== DECLARATION + SIGNATURE =====================
  const sigW = 52;
  const declW = usableW - sigW - 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);

  const declText = doc.splitTextToSize(declaration, declW - 4);
  const declH = Math.max(18, 8 + declText.length * 4);

  doc.rect(marginX, y, declW, declH);
  doc.text("Declaration", marginX + 2, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(declText, marginX + 2, y + 9);

  const sigX = marginX + declW + 2;
  doc.rect(sigX, y, sigW, declH);
  doc.setFont("helvetica", "normal");
  doc.text(signature, sigX + 2, y + declH - 7);
  doc.setFont("helvetica", "bold");
  doc.text("Authorised Signatory", sigX + 2, y + declH - 2.5);

  // ===================== FOOTER =====================
  if (jurisdiction) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`SUBJECT TO ${String(jurisdiction).toUpperCase()} JURISDICTION`, marginX, pageH - 6);
  }
  if (clinic.email) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(String(clinic.email), pageW - marginX, pageH - 6, { align: "right" });
  }

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
