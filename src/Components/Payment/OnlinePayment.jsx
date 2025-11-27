// src/pages/OnlinePayment.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../utils/axios";
import { motion } from "framer-motion";

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });

const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));

const OnlinePayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // From ViewBillDetails (optional): { billId, remaining, grandTotal, patientName }
  const passedBillId = location?.state?.billId || "";
  const passedRemaining = Number(location?.state?.remaining ?? 0);
  const passedGrandTotal = Number(location?.state?.grandTotal ?? 0);
  const passedPatientName = location?.state?.patientName || "";

  const [billingId, setBillingId] = useState("");
  const [amount, setAmount] = useState("");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/view-bills", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        // Enrich each bill with totals
        const enriched = (Array.isArray(data) ? data : []).map((b) => {
          const total = Number(b?.summary?.grand_total ?? b?.total_amount ?? 0);
          const paid = Number(b?.paid_amount ?? 0);
          const remaining = Math.max(0, total - paid);
          return { ...b, _amount_total: total, _amount_paid: paid, _amount_remaining: remaining };
        });

        // Show only bills that still have something due
        const payable = enriched.filter(
          (b) => ["pending", "partial"].includes(b.payment_status) && b._amount_remaining > 0
        );

        setBills(payable);

        if (passedBillId) {
          const match = payable.find((p) => p._id === passedBillId);
          if (match) {
            setBillingId(match._id);
            // default to the remaining from state (if provided) else computed remaining
            const defaultAmt = passedRemaining || match._amount_remaining;
            setAmount(String(defaultAmt));
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

  // Load Razorpay SDK
  useEffect(() => {
    loadRazorpay()
      .then(() => setSdkReady(true))
      .catch(() => setError("Unable to load payment SDK"));
  }, []);

  const selectedBill = useMemo(
    () => bills.find((b) => b._id === billingId),
    [bills, billingId]
  );

  const handleBillChange = (e) => {
    const id = e.target.value;
    const sel = bills.find((b) => b._id === id);
    if (sel) {
      setBillingId(id);
      // default to full remaining (user can lower it)
      setAmount(String(sel._amount_remaining));
    } else {
      setBillingId("");
      setAmount("");
    }
  };

  const maxRemaining = selectedBill ? Number(selectedBill._amount_remaining) : 0;

  const handlePay = async () => {
    setError("");
    try {
      if (!sdkReady) return alert("Payment SDK not ready. Please try again.");
      const amt = Number(amount);
      if (!billingId) return alert("Please select a bill.");
      if (!(amt > 0)) return alert("Enter a valid amount (> 0).");
      if (selectedBill && amt > maxRemaining) {
        return alert(`Amount exceeds remaining due (${money(maxRemaining)}).`);
      }

      // Create Razorpay order for this exact amount
      const initRes = await api.post(
        `/bills/${billingId}/payments/online/initiate`,
        { amount: amt },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      const { orderId, amount: orderAmount, currency } = initRes.data || {};
      if (!orderId || !orderAmount) {
        return alert("Failed to create payment order.");
      }

      const name = selectedBill?.caseId?.patient_name || passedPatientName || "Patient";
      const contact = selectedBill?.caseId?.patient_phone || "0000000000";

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: orderAmount, // in paise from server
        currency: currency || "INR",
        name: "India Therapy Centre",
        description: "Case Payment",
        order_id: orderId,
        prefill: {
          name,
          email: "indiatherapycentre@gmail.com",
          contact,
        },
        theme: { color: "#0284c7" },
        handler: async (response) => {
          try {
            const verifyRes = await api.post(
              `/bills/${billingId}/payments/online/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: amt,
                provider: "razorpay",
                notes: "Auto-generated",
              },
              { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );

            const inv =
              verifyRes?.data?.receipt?.invoiceNumber ||
              verifyRes?.data?.invoice?.invoiceNumber ||
              verifyRes?.data?.finalInvoice?.invoiceNumber;
            alert(`✅ Payment successful! ${inv ? "Invoice: " + inv : ""}`);
            navigate(`/admin/bill-details/${billingId}`, { replace: true });
          } catch (e) {
            alert(e?.response?.data?.error || "Verification failed");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || err?.response?.data?.message || "❌ Payment failed");
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 via-white to-emerald-50 py-10 px-4">
      <motion.div
        className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-6"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-xl">🔒</div>
          <div>
            <h2 className="text-2xl font-bold text-sky-700">Online Payment</h2>
            <p className="text-slate-500 text-sm">Secure checkout via Razorpay</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-10">Loading bills…</div>
        ) : error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
        ) : (
          <>
            {/* Select Bill */}
            <label className="block mb-2 font-medium text-slate-700">Select Bill</label>
            <select
              className="w-full p-2 border rounded-lg mb-2"
              value={billingId}
              onChange={handleBillChange}
              disabled={!!passedBillId} // lock if opened from details page
            >
              <option value="">-- Select Bill --</option>
              {bills.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.caseId?.patient_name || "Unnamed"} • Total {money(b._amount_total)} • Paid{" "}
                  {money(b._amount_paid)} • Due {money(b._amount_remaining)}
                </option>
              ))}
            </select>

            {/* Totals summary */}
            {selectedBill && (
              <div className="text-xs text-slate-600 mb-3">
                <div>Grand Total: <strong>{money(selectedBill._amount_total)}</strong></div>
                <div>Paid: <strong>{money(selectedBill._amount_paid)}</strong></div>
                <div>Remaining: <strong>{money(selectedBill._amount_remaining)}</strong></div>
              </div>
            )}

            {/* Amount (editable; cap to remaining) */}
            <div className="mb-4">
              <label className="block mb-2 font-medium text-slate-700">Amount (₹)</label>
              <input
                type="number"
                className="w-full p-2 border rounded-lg"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                max={selectedBill ? selectedBill._amount_remaining : undefined}
                placeholder={selectedBill ? String(selectedBill._amount_remaining) : "0.00"}
              />
              <p className="text-xs text-slate-500 mt-1">
                {selectedBill
                  ? `Max payable now: ${money(selectedBill._amount_remaining)}`
                  : "Select a bill to see remaining."}
              </p>
            </div>

            {/* Pay Button */}
            <motion.button
              onClick={handlePay}
              disabled={!billingId || !sdkReady || !(Number(amount) > 0)}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-semibold shadow"
            >
              Pay with Razorpay
            </motion.button>

            {/* Footer note */}
            <p className="text-xs text-slate-500 mt-3 text-center">
              You’ll be redirected to complete the payment securely.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default OnlinePayment;
