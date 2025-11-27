// src/pages/OfflinePayment.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../utils/axios";
import { motion } from "framer-motion";

const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));

const OfflinePayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // From ViewBillDetails: state: { billId, remaining, grandTotal, patientName }
  const passedBillId = location?.state?.billId || "";
  const passedRemaining = Number(location?.state?.remaining ?? 0);
  const passedGrandTotal = Number(location?.state?.grandTotal ?? 0);

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    billingId: "",
    amount: "",
    provider: "Cash",
    notes: "",
  });

  // fetch bills (pending + partial)
  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/view-bills", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const enriched = (Array.isArray(data) ? data : []).map((b) => {
          const total = Number(b?.summary?.grand_total ?? b?.total_amount ?? 0);
          const paid = Number(b?.paid_amount ?? 0);
          const remaining = Math.max(0, total - paid);
          return { ...b, _amount_total: total, _amount_paid: paid, _amount_remaining: remaining };
        });

        // show only bills with something left to pay
        const payable = enriched.filter(
          (b) => ["pending", "partial"].includes(b.payment_status) && b._amount_remaining > 0
        );

        setBills(payable);

        if (passedBillId) {
          // If we were sent from the details page, preselect and prefill amount with remaining
          const match = payable.find((p) => p._id === passedBillId);
          if (match) {
            setForm((f) => ({
              ...f,
              billingId: match._id,
              amount: String(passedRemaining || match._amount_remaining),
            }));
          } else {
            setError("Selected bill is fully paid or not found among payable bills.");
          }
        }
      } catch (err) {
        console.error("Failed to load bills:", err);
        setError(err?.response?.data?.error || "Failed to load bills.");
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [passedBillId, passedRemaining]);

  const selectedBill = useMemo(
    () => bills.find((b) => b._id === form.billingId),
    [bills, form.billingId]
  );

  const maxRemaining = selectedBill ? Number(selectedBill._amount_remaining) : 0;

  const handleBillChange = (e) => {
    const billingId = e.target.value;
    const sel = bills.find((b) => b._id === billingId);
    if (sel) {
      setForm((f) => ({
        ...f,
        billingId,
        amount: String(sel._amount_remaining), // default to remaining; user can edit down
      }));
    } else {
      setForm((f) => ({ ...f, billingId: "", amount: "" }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const amt = Number(form.amount);
    if (!form.billingId) return setError("Please select a bill.");
    if (!(amt > 0)) return setError("Enter a valid amount (> 0).");
    if (selectedBill && amt > maxRemaining) {
      return setError(`Amount exceeds remaining due (${money(maxRemaining)}).`);
    }

    try {
      const res = await api.post(
        `/bills/${form.billingId}/payments/offline`,
        {
          amount: amt,
          provider: form.provider || "Cash",
          notes: form.notes || "",
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      setResult(res.data);
      // Go back to bill details to reflect updated status/remaining
      navigate(`/admin/bill-details/${form.billingId}`, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Offline payment failed";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-sky-50 py-10 px-4">
      <motion.div
        className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-6"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl">
            🧾
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-700">Offline Payment</h2>
            <p className="text-slate-500 text-sm">Record cash / UPI / card at counter</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-10">Loading bills…</div>
        ) : error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Select Bill */}
            <div>
              <label className="block mb-1 font-medium text-slate-700">Select Bill</label>
              <select
                className="w-full p-2 border rounded-lg"
                value={form.billingId}
                onChange={handleBillChange}
                required
                disabled={!!passedBillId} // locked if opened from bill details
              >
                <option value="">-- Select Bill --</option>
                {bills.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.caseId?.patient_name || "Unnamed"} • Total {money(b._amount_total)} • Paid{" "}
                    {money(b._amount_paid)} • Due {money(b._amount_remaining)}
                  </option>
                ))}
              </select>

              {selectedBill && (
                <div className="mt-2 text-xs text-slate-600">
                  <div>Grand Total: <strong>{money(selectedBill._amount_total)}</strong></div>
                  <div>Paid: <strong>{money(selectedBill._amount_paid)}</strong></div>
                  <div>Remaining: <strong>{money(selectedBill._amount_remaining)}</strong></div>
                </div>
              )}
            </div>

            {/* Amount (editable; cap to remaining) */}
            <div>
              <label className="block mb-1 font-medium text-slate-700">Amount (₹)</label>
              <input
                type="number"
                name="amount"
                className="w-full p-2 border rounded-lg"
                value={form.amount}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                max={selectedBill ? selectedBill._amount_remaining : undefined}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                {selectedBill
                  ? `Max you can collect now: ${money(selectedBill._amount_remaining)}`
                  : "Select a bill to see remaining."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                name="provider"
                placeholder="Provider (e.g., Cash, UPI, Card)"
                value={form.provider}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="text"
                name="notes"
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={!form.billingId}
              className={`w-full text-white py-3 rounded-xl font-semibold shadow ${
                form.billingId ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-400"
              }`}
            >
              Submit Payment
            </motion.button>
          </form>
        )}

        {result && (
          <motion.div
            className="mt-6 p-4 border rounded-xl bg-emerald-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="font-semibold text-emerald-700">✅ Payment recorded!</p>
            <p className="text-sm">Transaction ID: {result.transaction?._id}</p>
            <p className="text-sm">
              Receipt#: {result.receipt?.invoiceNumber || result.invoice?.invoiceNumber}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default OfflinePayment;
