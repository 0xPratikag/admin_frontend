// src/pages/billing/InvoiceDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { buildAxios, inr, toNum  } from "../Bill/_billingUtils";
import { handleDownloadInvoiceByInvoiceId } from "./handleDownloadInvoice";


function Badge({ tone = "slate", children }) {
  const map = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-lg border ${map[tone] || map.slate}`}>
      {children}
    </span>
  );
}

function safeDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function InvoiceDetails() {
  const { invoiceId } = useParams();
  const api = useMemo(() => axios.create(buildAxios()), []);
  const navigate = useNavigate();

  const [inv, setInv] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(true);
  const [err, setErr] = useState("");

  const status = inv?.payment_status || "unpaid";
  const statusTone =
    status === "paid" ? "emerald" :
    status === "partial" ? "amber" :
    status === "overpaid" ? "indigo" : "red";

  const due = toNum(inv?.amount_due, 0);

  useEffect(() => {
    if (!invoiceId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get(`/invoices/${invoiceId}`);
        const doc = res.data?.data || res.data;
        if (!alive) return;
        setInv(doc);
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
  }, [api, invoiceId]);

  useEffect(() => {
    if (!invoiceId) return;
    let alive = true;

    (async () => {
      setPayLoading(true);
      try {
        const res = await api.get(`/invoices/${invoiceId}/payments`);
        const rows = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
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
  }, [api, invoiceId]);

  const totals = useMemo(() => {
    return {
      subtotal: toNum(inv?.subtotal, 0),
      discount: toNum(inv?.total_discount, 0),
      tax: toNum(inv?.tax_amount, 0),
      grand: toNum(inv?.grand_total, 0),
      paid: toNum(inv?.amount_paid, 0),
      due: toNum(inv?.amount_due, 0),
    };
  }, [inv]);

const onDownload = async () => {
  await handleDownloadInvoiceByInvoiceId(invoiceId, { preview: false });
};


  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-10 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Invoice</div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              {inv?.invoiceNumber || invoiceId}
            </h1>
            <div className="mt-2 flex gap-2 flex-wrap items-center">
              <Badge tone={statusTone}>{status.toUpperCase()}</Badge>
              <Badge tone="slate">Created: {safeDate(inv?.createdAt)}</Badge>
              <Badge tone={due > 0 ? "amber" : "emerald"}>Due: {inr(due)}</Badge>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700"
            >
              Back
            </button>

            <button
              onClick={onDownload}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 font-semibold text-indigo-700 disabled:opacity-50"
              title="Download PDF"
            >
              Download
            </button>

            <button
              onClick={() => navigate(`/admin/invoices/${invoiceId}/payment`)}
              disabled={loading || !inv}
              className={`px-5 py-2 rounded-xl font-extrabold text-white shadow disabled:opacity-60 ${
                due > 0 ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700" : "bg-slate-400"
              }`}
              title={due > 0 ? "Make payment" : "No due amount"}
            >
              Make Payment
            </button>
          </div>
        </div>

        {err ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {err}
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
          <>
            {/* Patient / Case */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="font-bold text-slate-900">Patient</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-xs text-slate-500">Name</div>
                    <div className="font-extrabold text-slate-900 mt-1">{inv.patient_name || "—"}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-xs text-slate-500">Phone</div>
                    <div className="font-extrabold text-slate-900 mt-1">{inv.patient_phone || "—"}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-xs text-slate-500">Patient ID</div>
                    <div className="font-bold text-slate-900 mt-1">{inv.p_id || "—"}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-xs text-slate-500">Case UID</div>
                    <div className="font-bold text-slate-900 mt-1">{inv.case_uid || "—"}</div>
                  </div>
                </div>

                {inv.caseId ? (
                  <div className="mt-3 text-xs text-slate-500">
                    <Link className="text-indigo-600 underline" to={`/admin/case-details/${inv.caseId}`} target="_blank">
                      View Case Details
                    </Link>
                  </div>
                ) : null}
              </div>

              {/* Totals */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="font-bold text-slate-900">Totals</div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold text-slate-900">{inr(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Discount</span>
                    <span className="font-semibold text-amber-700">- {inr(totals.discount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax</span>
                    <span className="font-semibold text-slate-900">{inr(totals.tax)}</span>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between">
                    <span className="text-slate-600">Grand Total</span>
                    <span className="font-extrabold text-slate-900">{inr(totals.grand)}</span>
                  </div>

                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between">
                    <span className="text-slate-600">Paid</span>
                    <span className="font-bold text-emerald-700">{inr(totals.paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Due</span>
                    <span className={`font-extrabold ${totals.due > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {inr(totals.due)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Items</div>
                  <div className="text-xs text-slate-500">{(inv.items || []).length} line(s)</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600 border-b bg-slate-50">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Qty</th>
                      <th className="py-3 px-4">Base</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4">Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inv.items || []).map((it, idx) => (
                      <tr key={`${it._id || idx}`} className="border-b last:border-b-0 hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{it.name || "—"}</div>
                          <div className="text-xs text-slate-500">
                            {it.therapy_name || "—"} {it.item_code ? `• ${it.item_code}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge tone={it.item_type === "SUB" ? "indigo" : "emerald"}>
                            {it.item_type || "—"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {it.item_type === "SUB" ? (it.sessions_count ?? "—") : 1}
                        </td>
                        <td className="py-3 px-4">{inr(it.base_amount || 0)}</td>
                        <td className="py-3 px-4 text-amber-700">- {inr(it.discount_amount || 0)}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{inr(it.final_amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {inv.notes ? (
                <div className="px-5 py-4 border-t bg-white text-sm">
                  <div className="text-xs font-semibold text-slate-600">Notes</div>
                  <div className="mt-1 text-slate-800">{inv.notes}</div>
                </div>
              ) : null}
            </div>

            {/* Payments */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Payments</div>
                  <div className="text-xs text-slate-500">{payLoading ? "Loading…" : `${payments.length} payment(s)`}</div>
                </div>

                <button
                  onClick={() => navigate(`/admin/invoices/${invoiceId}/payment`)}
                  className="px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 font-semibold text-emerald-700"
                >
                  Add Payment
                </button>
              </div>

              {payLoading ? (
                <div className="p-6 text-slate-600">Loading payments…</div>
              ) : !payments.length ? (
                <div className="p-6 text-slate-600">No payments recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-600 border-b bg-slate-50">
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Mode</th>
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Paid At</th>
                        <th className="py-3 px-4">Received By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p._id} className="border-b last:border-b-0 hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-extrabold text-slate-900">{inr(p.amount || 0)}</td>
                          <td className="py-3 px-4">{p.mode || "—"}</td>
                          <td className="py-3 px-4">{p.reference_id || "—"}</td>
                          <td className="py-3 px-4">{safeDate(p.paid_at || p.createdAt)}</td>
                          <td className="py-3 px-4">{p?.received_by?.name || p?.received_by?.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
