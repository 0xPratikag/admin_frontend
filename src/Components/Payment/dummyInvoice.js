import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const logoBase64 =
  "https://static.vecteezy.com/system/resources/previews/026/513/688/original/data-analytics-logo-design-growth-arrow-logo-design-for-data-finance-investment-vector.jpg";

export const handleDownloadInvoice = async (id) => {
  const token = localStorage.getItem("admin_token");
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  try {
    const res = await axios.get(`${baseURL}/invoice/by-transaction/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = res.data;
    const doc = new jsPDF();
    const startX = 14;
    let currentY = 20;

    // 📦 Draw outer border
    doc.setDrawColor(150);
    doc.rect(10, 10, 190, 277); // full A4 box

    // 🖼️ Logo
    doc.addImage(logoBase64, "PNG", 160, 12, 35, 20);

    // 🧾 Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", startX, currentY);
    currentY += 8;






    

    // 🏥 Clinic Info Box
    doc.setLineWidth(0.2);
    doc.setDrawColor(180);
    doc.rect(startX, currentY - 4, 180, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(data.clinic.name, startX + 2, currentY);
    doc.text(data.clinic.address, startX + 2, currentY + 6);
    doc.text(`GSTIN/UIN: ${data.clinic.gstin}`, startX + 2, currentY + 12);
    doc.text(
      `State Name: ${data.clinic.stateName}, Code: ${data.clinic.stateCode}`,
      startX + 2,
      currentY + 18
    );
    doc.text(`E-Mail: ${data.clinic.email}`, startX + 2, currentY + 24);
    currentY += 36;



    
    // 👤 Buyer Info Box
    doc.setFont("helvetica", "bold");
    doc.text("Buyer (Bill to):", startX, currentY);
    doc.setFont("helvetica", "normal");
    currentY += 6;
    doc.rect(startX, currentY - 10, 180, 34);
    doc.text(
      `${data.patient.name} (PATIENT ID - ${data.patient.caseId})`,
      startX + 2,
      currentY
    );
    doc.text(`Phone: ${data.patient.phone}`, startX + 2, currentY + 6);
    doc.text(`Case Type: ${data.patient.caseType}`, startX + 2, currentY + 12);
    doc.text(
      `State Name: ${data.patient.stateName}, Code: ${data.patient.stateCode}`,
      startX + 2,
      currentY + 18
    );
    doc.text(
      `Place of Supply: ${data.patient.placeOfSupply}`,
      startX + 2,
      currentY + 24
    );
    currentY += 34;

    // 🧾 Invoice Meta Box
    doc.rect(startX, currentY, 180, 14);
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice No:`, startX + 2, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.invoice.number}`, startX + 40, currentY + 6);

    doc.setFont("helvetica", "bold");
    doc.text(`Dated:`, startX + 100, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.invoice.date}`, startX + 120, currentY + 6);
    currentY += 20;











    // 📋 Services Table
    const serviceTable = [["Description of Goods", "Amount"]];
    if (data.invoice.services.length > 0) {
      data.invoice.services.forEach((service) => {
        serviceTable.push([service.name, `₹ ${service.cost.toFixed(2)}`]);
      });
    } else {
      serviceTable.push([
        "Consultation / Therapy",
        `₹ ${data.invoice.totalAmount.toFixed(2)}`,
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      head: [serviceTable[0]],
      body: serviceTable.slice(1),
      styles: {
        lineWidth: 0.1,
        lineColor: 100,
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 0,
        halign: "center",
      },
      bodyStyles: {
        textColor: "#111827",
      },
      margin: { left: startX, right: 14 },
    });

    const tableY = doc.lastAutoTable.finalY + 6;

    // 🗓️ Validity Box
    doc.setFont("helvetica", "bold");
    doc.text("SERVICE VALIDITY TENURE", startX, tableY);
    doc.setFont("helvetica", "normal");
    doc.rect(startX, tableY + 2, 180, 10);
    doc.text(
      `${data.invoice.validity.from} TO ${data.invoice.validity.to}`,
      startX + 2,
      tableY + 9
    );

    let nextY = tableY + 20;

    // 💰 Totals
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ₹ ${data.invoice.totalAmount.toFixed(2)}`, startX, nextY);
    doc.setFont("helvetica", "normal");
    nextY += 6;
    doc.text("Amount Chargeable (in words):", startX, nextY);
    nextY += 6;
    doc.rect(startX, nextY - 4, 180, 10);
    doc.text(data.invoice.amountInWords, startX + 2, nextY + 3);
    nextY += 16;

    // 📜 Declaration Box
    doc.setFont("helvetica", "bold");
    doc.text("Declaration", startX, nextY);
    doc.setFont("helvetica", "normal");
    const declText = doc.splitTextToSize(data.declaration, 176);
    doc.rect(startX, nextY + 2, 180, declText.length * 6);
    doc.text(declText, startX + 2, nextY + 8);
    nextY += declText.length * 6 + 10;

    // 🏦 Bank Details Box
    doc.setFont("helvetica", "bold");
    doc.text("Company's Bank Details", startX, nextY);
    doc.rect(startX, nextY + 2, 180, 26);
    doc.setFont("helvetica", "normal");
    doc.text(
      `A/c Holder's Name: ${data.bank.accountHolder}`,
      startX + 2,
      nextY + 8
    );
    doc.text(`Bank Name: ${data.bank.bankName}`, startX + 2, nextY + 14);
    doc.text(`A/c No.: ${data.bank.accountNumber}`, startX + 2, nextY + 20);
    doc.text(
      `Branch & IFS Code: ${data.bank.branch} & ${data.bank.ifsc}`,
      startX + 2,
      nextY + 26
    );

    // ✅ Footer
    doc.setFont("helvetica", "bold");
    doc.text(data.signature, 140, nextY + 36);
    doc.setFont("helvetica", "normal");
    doc.text("Authorised Signatory", 140, nextY + 42);
    doc.text(
      `SUBJECT TO ${data.jurisdiction} JURISDICTION`,
      startX,
      nextY + 42
    );
    doc.setFontSize(10);
    doc.setTextColor("#9CA3AF");
    doc.text(
      "This is a computer-generated invoice and does not require a signature.",
      startX,
      nextY + 50
    );

    // Save PDF
    doc.save(`Invoice_${data.invoice.number}.pdf`);
  } catch (err) {
    alert(
      "Failed to download invoice: " +
        (err.response?.data?.error || err.message)
    );
  }
};
