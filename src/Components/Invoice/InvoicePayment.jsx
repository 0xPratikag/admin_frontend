// src/pages/billing/InvoicePayment.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { buildAxios, inr, toNum  } from "../Bill/_billingUtils";


function safeDateInput(d = new Date()) {
  // yyyy-MM-ddThh:mm for datetime-local
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function safeDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function InvoicePayment() {
  const { invoiceId } = useParams();
  const api = useMemo(() => axios.create(buildAxios()), []);
  const navigate = useNavigate();

  const [inv, setInv] = useState(null);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // form
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [referenceId, setReferenceId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(safeDateInput(new Date()));

  const due = toNum(inv?.amount_due, 0);

  const loadInvoice = async () => {
    const res = await api.get(`/invoices/${invoiceId}`);
    return res.data?.data || res.data;
  };

  const loadPayments = async () => {
    const res = await api.get(`/invoices/${invoiceId}/payments`);
    return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    if (!invoiceId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const doc = await loadInvoice();
        if (!alive) return;
        setInv(doc);

        // default amount = due
        const d = toNum(doc?.amount_due, 0);
        setAmount(d > 0 ? String(d) : "");
      } catch (e) {
        if (!alive) return;
        setInv(null);
        setErr(e?.response?.data?.message || "Failed to load invoice.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId) return;
    let alive = true;

    (async () => {
      setPayLoading(true);
      try {
        const rows = await loadPayments();
        if (!alive) return;
        setPayments(rows);
      } catch {
        if (!alive) return;
        setPayments([]);
      } finally {
        if (!alive) return;
        setPayLoading(false);
      }
    })();

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const quickFill = (pct) => {
    if (!inv) return;
    const d = toNum(inv.amount_due, 0);
    if (d <= 0) return;
    const val = Math.max(1, Math.round(d * pct));
    setAmount(String(val));
  };

  const submit = async () => {
    setErr("");
    setOkMsg("");

    const amt = toNum(amount, 0);
    if (!amt || amt < 1) return setErr("Amount must be >= 1");
    if (!invoiceId) return setErr("Missing invoiceId");

    try {
      setSaving(true);

      await api.post(`/invoices/${invoiceId}/payments`, {
        amount: amt,
        mode,
        reference_id: referenceId || undefined,
        payer_name: payerName || undefined,
        payer_phone: payerPhone || undefined,
        notes: notes || undefined,
        paid_at: paidAt ? new Date(paidAt).toISOString() : undefined,
      });

      // refresh
      const [doc, rows] = await Promise.all([loadInvoice(), loadPayments()]);
      setInv(doc);
      setPayments(rows);

      setOkMsg("✅ Payment recorded successfully.");
      setReferenceId("");
      setNotes("");

      // if invoice paid, keep amount blank
      const nextDue = toNum(doc?.amount_due, 0);
      setAmount(nextDue > 0 ? String(nextDue) : "");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-10 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Payment</div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Make Payment
            </h1>
            <div className="mt-2 text-sm text-slate-600">
              Invoice: <span className="font-semibold">{inv?.invoiceNumber || invoiceId}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => navigate(`/admin/invoices/${invoiceId}`)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700"
            >
              Back to Details
            </button>
          </div>
        </div>

        {err ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {err}
          </div>
        ) : null}

        {okMsg ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            {okMsg}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
            Loading invoice…
          </div>
        ) : !inv ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
            Invoice not found.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: form */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold text-slate-900">Payment Form</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Due: <span className={`font-extrabold ${due > 0 ? "text-amber-700" : "text-emerald-700"}`}>{inr(due)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => quickFill(0.5)}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm"
                    disabled={due <= 0}
                  >
                    50%
                  </button>
                  <button
                    onClick={() => quickFill(1)}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm"
                    disabled={due <= 0}
                  >
                    Full
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Amount</div>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Mode</div>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Reference ID</div>
                  <input
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="Txn / UPI / Ref ID"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Payer Name</div>
                  <input
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Payer Phone</div>
                  <input
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Paid At</div>
                  <input
                    type="datetime-local"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Notes</div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={submit}
                  disabled={saving}
                  className={`px-6 py-3 rounded-xl font-extrabold text-white shadow ${
                    saving ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  }`}
                >
                  {saving ? "Saving..." : "Record Payment"}
                </button>

                <button
                  onClick={() => navigate(`/admin/invoices/${invoiceId}`)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Right: summary + history */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <div className="font-bold text-slate-900">Invoice Summary</div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Grand Total</span>
                  <span className="font-extrabold text-slate-900">{inr(inv.grand_total || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid</span>
                  <span className="font-bold text-emerald-700">{inr(inv.amount_paid || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Due</span>
                  <span className={`font-extrabold ${toNum(inv.amount_due, 0) > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {inr(inv.amount_due || 0)}
                  </span>
                </div>
              </div>

              <div className="h-px bg-slate-200 my-4" />

              <div className="font-bold text-slate-900">Payment History</div>

              {payLoading ? (
                <div className="mt-3 text-slate-600 text-sm">Loading…</div>
              ) : !payments.length ? (
                <div className="mt-3 text-slate-600 text-sm">No payments yet.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {payments.slice(0, 8).map((p) => (
                    <div key={p._id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-extrabold text-slate-900">{inr(p.amount || 0)}</div>
                        <div className="text-xs text-slate-600">{p.mode || "—"}</div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {safeDate(p.paid_at || p.createdAt)} {p.reference_id ? `• Ref: ${p.reference_id}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {payments.length > 8 ? (
                <div className="text-xs text-slate-500 mt-2">
                  Showing latest 8 payments.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
