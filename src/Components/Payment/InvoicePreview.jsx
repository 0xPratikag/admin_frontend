import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { motion } from "framer-motion";

const rupee = (n) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const InvoicePreview = ({ transactionId, data }) => {
  const [invoiceData, setInvoiceData] = useState(data || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState("");
  const invoiceRef = useRef();

  // Fetch only if data not supplied
  useEffect(() => {
    const fetchInvoice = async () => {
      if (data || !transactionId) return;
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const baseURL = import.meta.env.VITE_API_BASE_URL;
        const res = await axios.get(`${baseURL}/invoice/by-transaction/${transactionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInvoiceData(res.data);
      } catch (err) {
        console.error("Error fetching invoice data", err);
        setError(err?.response?.data?.error || "Failed to load invoice.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [transactionId, data]);

  const downloadPDF = async () => {
    const input = invoiceRef.current;
    // Slightly increase scale for sharper PDF
    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    const num = invoiceData?.invoice?.number || "Invoice";
    pdf.save(`${num}.pdf`);
  };

  const onPrint = () => {
    window.print();
  };

  const services = useMemo(() => invoiceData?.invoice?.services || [], [invoiceData]);
  const totals = useMemo(() => {
    const subtotal = services.reduce((s, it) => s + (Number(it.cost) || 0), 0);
    const gstTotal = services.reduce(
      (s, it) => s + ((Number(it.cost) || 0) * (Number(it.gstRate) || 0)) / 100,
      0
    );
    const computedGrand = subtotal + gstTotal;
    const apiGrand = Number(invoiceData?.invoice?.totalAmount || 0);
    // prefer API total if present
    const grand = apiGrand > 0 ? apiGrand : computedGrand;
    return {
      subtotal,
      gstTotal,
      grand,
    };
  }, [services, invoiceData]);

  if (loading) return <div className="text-center p-6 text-slate-500">Loading invoice…</div>;
  if (error) return <div className="text-center p-6 text-red-600">{error}</div>;
  if (!invoiceData) return <div className="text-center p-6 text-slate-500">No invoice data.</div>;

  const { clinic, patient, invoice, bank, declaration, signature, jurisdiction } = invoiceData;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-end gap-2 mb-3">
        <button
          onClick={onPrint}
          className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm shadow"
        >
          Print
        </button>
        <button
          onClick={downloadPDF}
          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm shadow"
        >
          Download PDF
        </button>
      </div>

      {/* Invoice Body */}
      <motion.div
        ref={invoiceRef}
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-white shadow-xl rounded-xl border border-slate-200 overflow-hidden"
      >
        {/* top accent */}
        <div className="h-2 bg-gradient-to-r from-sky-600 via-cyan-500 to-emerald-500" />

        {/* Watermark / emblem */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] print:opacity-[0.06] flex items-center justify-center">
          {/* Caduceus-like emblem */}
          <svg width="360" height="360" viewBox="0 0 24 24" fill="currentColor" className="text-sky-900">
            <path d="M12 2a3 3 0 0 0-3 3v3H7a3 3 0 0 0 0 6h2v2H7a3 3 0 0 0 0 6h3v-4h4v4h3a3 3 0 0 0 0-6h-2v-2h2a3 3 0 0 0 0-6h-2V5a3 3 0 0 0-3-3Zm-1 3a1 1 0 1 1 2 0v3h-2V5Zm-4 5h10a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2Zm0 8a1 1 0 0 1 1-1h2v2H8a1 1 0 0 1-1-1Zm10 1h-2v-2h2a1 1 0 0 1 0 2Z"/>
          </svg>
        </div>

        {/* Header */}
        <div className="relative px-6 sm:px-8 pt-6 pb-5 border-b bg-gradient-to-br from-sky-50 via-white to-emerald-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs tracking-widest text-sky-700 font-semibold">TAX INVOICE</div>
              <h1 className="text-2xl font-extrabold text-slate-800 mt-1">{clinic?.name}</h1>
              <p className="text-slate-700 text-sm">{clinic?.address}</p>
              <p className="text-slate-600 text-sm">GSTIN/UIN: {clinic?.gstin}</p>
              <p className="text-slate-600 text-sm">
                State Name: {clinic?.stateName}, Code: {clinic?.stateCode}
              </p>
              <p className="text-slate-600 text-sm">Email: {clinic?.email}</p>
            </div>

            {/* Logo placeholder (replace src if you have a clinic logo) */}
            <div className="shrink-0">
              <div className="w-28 h-28 rounded-xl border border-sky-200 bg-white flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-10 h-10 text-sky-600"
                  fill="currentColor"
                >
                  <path d="M10 2h4v6h6v4h-6v6h-4v-6H4V8h6z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Invoice meta strip */}
          <div className="mt-5 grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-sky-200/70 bg-white/70 px-3 py-2">
              <div className="text-slate-500">Invoice No</div>
              <div className="font-semibold text-slate-800">{invoice?.number}</div>
            </div>
            <div className="rounded-lg border border-sky-200/70 bg-white/70 px-3 py-2">
              <div className="text-slate-500">Dated</div>
              <div className="font-semibold text-slate-800">{invoice?.date}</div>
            </div>
            <div className="rounded-lg border border-sky-200/70 bg-white/70 px-3 py-2">
              <div className="text-slate-500">Status</div>
              <div className="font-semibold">
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  invoice?.status === "paid" ? "bg-emerald-100 text-emerald-800" :
                  invoice?.status === "pending" ? "bg-amber-100 text-amber-800" :
                  "bg-slate-100 text-slate-800"
                }`}>
                  {(invoice?.status || "—").toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Patient + Bill To */}
        <div className="relative px-6 sm:px-8 py-5 grid sm:grid-cols-2 gap-5">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="px-4 py-2 border-b bg-slate-50 text-slate-700 font-semibold">
              Buyer (Bill to)
            </div>
            <div className="px-4 py-3 text-sm text-slate-800">
              <p className="font-semibold">{patient?.name} <span className="text-slate-500 font-normal">(Patient ID: {patient?.caseId})</span></p>
              <p>Phone: {patient?.phone || "N/A"}</p>
              <p>Case Type: {patient?.caseType || "N/A"}</p>
              <p>
                State: {patient?.stateName} ({patient?.stateCode}) | Place of Supply: {patient?.placeOfSupply}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="px-4 py-2 border-b bg-slate-50 text-slate-700 font-semibold">
              Service Validity
            </div>
            <div className="px-4 py-3 text-sm text-slate-800">
              <p>
                Valid From: <span className="font-medium">{invoice?.validity?.from}</span>
              </p>
              <p>
                Valid To: <span className="font-medium">{invoice?.validity?.to}</span>
              </p>
              {invoice?.notes ? (
                <p className="mt-2 text-slate-600">Notes: {invoice?.notes}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="relative px-6 sm:px-8 pb-1">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left border-r">Description of Service</th>
                  <th className="px-4 py-2 text-left border-r">HSN/SAC</th>
                  <th className="px-4 py-2 text-right border-r">GST %</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {services.length > 0 ? (
                  services.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 border-r">{item.name}</td>
                      <td className="px-4 py-2 border-r">{item.hsn || "—"}</td>
                      <td className="px-4 py-2 text-right border-r">{Number(item.gstRate || 0)}%</td>
                      <td className="px-4 py-2 text-right">{rupee(item.cost)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-2 border-r">Consultation / Therapy</td>
                    <td className="px-4 py-2 border-r">9993</td>
                    <td className="px-4 py-2 text-right border-r">0%</td>
                    <td className="px-4 py-2 text-right">{rupee(invoice?.totalAmount || 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="relative px-6 sm:px-8 pt-4 pb-5 grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-slate-700 font-semibold mb-2">Declaration</h3>
            <p className="text-slate-600 text-sm">{declaration}</p>

            <h3 className="text-slate-700 font-semibold mt-4 mb-2">Bank Details</h3>
            <div className="text-sm text-slate-800">
              <p>A/c Holder: <span className="font-medium">{bank?.accountHolder}</span></p>
              <p>Bank: <span className="font-medium">{bank?.bankName}</span></p>
              <p>Account No: <span className="font-medium">{bank?.accountNumber}</span></p>
              <p>Branch & IFSC: <span className="font-medium">{bank?.branch}</span> • <span className="font-medium">{bank?.ifsc}</span></p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-800">{rupee(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-600">GST (overall)</span>
              <span className="font-semibold text-slate-800">{rupee(totals.gstTotal)}</span>
            </div>
            <div className="h-px bg-slate-200 my-2" />
            <div className="flex items-center justify-between py-1 text-lg">
              <span className="font-semibold text-slate-800">Grand Total</span>
              <span className="font-bold text-sky-700">{rupee(totals.grand)}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Amount in words: <span className="italic">{invoice?.amountInWords}</span>
            </div>
          </div>
        </div>

        {/* Footer / signature */}
        <div className="relative px-6 sm:px-8 pb-8">
          <div className="flex items-end justify-between gap-6">
            <div className="text-xs text-slate-500">
              SUBJECT TO {jurisdiction} JURISDICTION<br />
              This is a computer-generated invoice and does not require a signature.
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-800">{signature}</p>
              <p className="text-slate-600 text-sm">Authorised Signatory</p>
              <div className="mt-3 w-36 h-14 border border-slate-300 rounded-lg" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Print Hint */}
      <p className="print:hidden text-center text-slate-500 text-xs mt-3">
        Tip: Use <span className="font-semibold">Print</span> for crisp A4 output.
      </p>
    </div>
  );
};

export default InvoicePreview;
