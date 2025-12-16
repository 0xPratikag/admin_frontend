// src/pages/ViewBillDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { handleDownloadFinalInvoiceByBill, handleDownloadInvoiceByCase } from "../Payment/handleDownloadInvoice";

const ViewBillDetails = () => {
  const { id } = useParams(); // billing id
  const navigate = useNavigate();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPayChoice, setShowPayChoice] = useState(false);

  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const authHeader = { Authorization: `Bearer ${localStorage.getItem("token")}` };

  const fetchBill = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${baseURL}/view-bill/${id}`, { headers: authHeader });
      setBill(res.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Something went wrong while fetching the bill."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBill(); /* eslint-disable-next-line */ }, [id]);

  const items = useMemo(() => bill?.line_items || [], [bill]);
  const summary = useMemo(() => bill?.summary || null, [bill]);

  const fmtINR = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));
  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const grandTotal = useMemo(
    () => Number(summary?.grand_total ?? bill?.total_amount ?? 0),
    [summary, bill]
  );
  const paidAmount = Number(bill?.paid_amount || 0);
  const remaining = Math.max(0, grandTotal - paidAmount);
  const canPay = remaining > 0;
  const pct = grandTotal > 0 ? Math.min(100, Math.round((paidAmount / grandTotal) * 100)) : 0;

  const handleOpenPay = () => setShowPayChoice(true);
  const handleClosePay = () => setShowPayChoice(false);

  const goOnlinePayment = () => {
   alert("functionality comming soon..")
  };
  const goOfflinePayment = () => {
    navigate("/admin/offlinepayment", {
      state: { billId: id, remaining, grandTotal, patientName: bill?.caseId?.patient_name || "Patient" },
    });
  };

  const editBill = () => {
    navigate(`/admin/generate-bill`, { state: { caseData: bill?.caseId, existingBill: bill } });
  };

const downloadInvoice = () => {
  handleDownloadFinalInvoiceByBill(id, { preview: false });
};


  if (loading) return <div className="p-6">Loading...</div>;
  if (error) {
    return (
      <div className="p-6 text-red-600 bg-red-100 border border-red-400 rounded-md max-w-2xl mx-auto mt-10">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }
  if (!bill) return <div className="p-6 text-slate-600 text-center">No bill found.</div>;

  const statusCls =
    bill.payment_status === "paid"
      ? "bg-green-100 text-green-700"
      : bill.payment_status === "partial"
      ? "bg-blue-100 text-blue-700"
      : bill.payment_status === "pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-sky-50 to-emerald-50 py-10 px-4">
      <motion.div
        className="bg-white shadow-xl rounded-2xl border border-slate-200 w-full max-w-5xl mx-auto px-8 py-10 relative"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-sky-600 rounded-t-2xl" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-bold text-sky-700 mb-1">Patient Bill</h1>
            <p className="text-sm text-slate-500">
              Bill ID: <span className="font-mono">{String(bill._id || "").slice(-6).toUpperCase()}</span>
            </p>
            <p className="text-sm text-slate-500">Created: {fmtDate(bill.createdAt)}</p>
          </div>

          <div className="flex gap-2 sm:gap-3">
            {/* Show invoice button when any payment happened */}
 {bill.payment_status === "paid" && (
  <button
    onClick={downloadInvoice}
    className="rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-3 py-2 text-sm font-semibold shadow"
  >
    ⬇️ Download Invoice
  </button>
)}


            <button
              onClick={editBill}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm font-semibold shadow"
            >
              ✏️ Edit Bill
            </button>
            <button
              onClick={fetchBill}
              className="rounded-lg border bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-sm font-semibold shadow-sm"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-10 text-sm">
          <div className="bg-sky-50/60 rounded-xl p-4 border border-sky-100">
            <h2 className="text-lg font-semibold text-sky-700 mb-2">Patient</h2>
            <div className="space-y-1 text-slate-700">
              <p><strong>Name:</strong> {bill.caseId?.patient_name}</p>
              <p><strong>Phone:</strong> {bill.caseId?.patient_phone || "—"}</p>
              <p><strong>P.ID:</strong> {bill.caseId?.p_id || "—"}</p>
              <p><strong>Type:</strong> {bill.caseId?.case_type || "—"}</p>
              <p><strong>Status:</strong> {bill.caseId?.status || "—"}</p>
            </div>
          </div>
          <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100">
            <h2 className="text-lg font-semibold text-emerald-700 mb-2">Clinic</h2>
            <div className="space-y-1 text-slate-700">
              <p><strong>Branch:</strong> {bill.adminId?.Branch_name || "—"}</p>
              <p><strong>Email:</strong> {bill.adminId?.branch_email || "—"}</p>
              <p><strong>Phone:</strong> {bill.adminId?.branch_phone || "—"}</p>
              <p><strong>Bill Date:</strong> {fmtDate(bill.bill_date)}</p>
              <p><strong>Due Date:</strong> {fmtDate(bill.due_date)}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Line Items</h2>
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-700">
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-3">{idx + 1}</td>
                    <td className="p-3">{it.description}</td>
                    <td className="p-3 text-right">{it.quantity}</td>
                    <td className="p-3 text-right">{fmtINR(it.rate)}</td>
                    <td className="p-3 text-right">{fmtINR(it.amount)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="p-3 text-slate-500" colSpan={5}>No items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals + Pay */}
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <div className="mt-2 space-y-2">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusCls}`}>
              {bill.payment_status}
            </span>
            <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-2 bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs text-slate-600">
              Overall {fmtINR(grandTotal)} • Paid {fmtINR(paidAmount)} • Due {fmtINR(remaining)}
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <div className="w-full sm:w-[22rem] bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold">{fmtINR(summary?.subtotal || 0)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Tax ({summary?.tax_percent || 0}%)</span>
                <span className="font-semibold">{fmtINR(summary?.tax_amount || 0)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Discount ({summary?.discount_percent || 0}%)</span>
                <span className="font-semibold">- {fmtINR(summary?.discount_amount || 0)}</span>
              </div>
              <div className="h-px bg-slate-200 my-2" />
              <div className="flex items-center justify-between py-1 text-lg">
                <span className="font-semibold text-slate-800">Grand Total</span>
                <span className="font-bold text-sky-700">{fmtINR(grandTotal)}</span>
              </div>

              {canPay && (
                <motion.button
                  type="button"
                  onClick={handleOpenPay}
                  whileTap={{ scale: 0.98 }}
                  className="mt-4 w-full rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 shadow"
                >
                  Pay
                </motion.button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-slate-500 border-t pt-4">
          This is a computer-generated invoice and does not require a signature.
        </div>
      </motion.div>

      {/* Pay Choice Modal */}
      <AnimatePresence>
        {showPayChoice && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClosePay}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <div className="mx-auto max-w-md bg-white rounded-t-2xl shadow-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Choose Payment Method</h3>
                  <button onClick={handleClosePay} className="text-slate-500 hover:text-slate-700" aria-label="Close">✕</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={goOnlinePayment}
                    className="rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-medium py-3 shadow-sm"
                  >
                    💳 Online Payment
                  </button>
                  <button
                    onClick={goOfflinePayment}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium py-3 shadow-sm"
                  >
                    🧾 Offline Payment
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3">You’ll be redirected with the bill reference automatically.</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewBillDetails;
