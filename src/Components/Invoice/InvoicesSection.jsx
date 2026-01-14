// src/pages/billing/InvoicesSection.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { buildAxios, inr, toNum, round2 } from "../Bill/_billingUtils";

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

function matchText(hay, needle) {
  return String(hay || "").toLowerCase().includes(String(needle || "").toLowerCase());
}

/** ✅ Simple modal (no extra deps) */
function NoInvoiceModal({ open, onClose, onGenerate, patientName }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <div className="text-xs opacity-90">Invoice Required</div>
          <div className="text-2xl font-extrabold tracking-tight">No Invoice Found</div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="flex gap-3">
            <div className="mt-1 h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <span className="text-indigo-700 text-lg">📄</span>
            </div>

            <div className="flex-1">
              <div className="text-slate-900 font-bold">
                This case doesn’t have an invoice yet.
              </div>
              <div className="mt-1 text-sm text-slate-600 leading-relaxed">
                {patientName ? (
                  <>
                    It looks like <span className="font-semibold">{patientName}</span> hasn’t been billed for this case.
                  </>
                ) : (
                  <>It looks like billing hasn’t been created for this case.</>
                )}
                {" "}
                Please generate an invoice first to view and manage payments.
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">What you can do next</div>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Create an invoice for selected therapies/tests</li>
                  <li>Apply discounts and tax</li>
                  <li>Download PDF and record payments</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700"
            >
              Not now
            </button>

            <button
              onClick={onGenerate}
              className="px-5 py-2 rounded-2xl font-extrabold text-white shadow-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
            >
              Generate Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesSection() {
  const api = useMemo(() => axios.create(buildAxios()), []);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // cases
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");

  // selected case
  const selectedCaseId = searchParams.get("caseId") || "";
  const [caseSearch, setCaseSearch] = useState("");

  // invoices
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ modal state
  const [showNoInvoiceModal, setShowNoInvoiceModal] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt_desc");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // load cases
  useEffect(() => {
    let alive = true;
    (async () => {
      setCasesLoading(true);
      setCasesError("");
      try {
        const res = await api.get("/cases", { params: caseSearch ? { q: caseSearch } : undefined });
        const items = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (!alive) return;
        setCases(items);
      } catch (e) {
        if (!alive) return;
        setCases([]);
        setCasesError(e?.response?.data?.message || "Failed to load cases.");
      } finally {
        if (!alive) return;
        setCasesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api, caseSearch]);

  // load invoices for selected case
  useEffect(() => {
    // close modal when case changes
    setShowNoInvoiceModal(false);

    if (!selectedCaseId) {
      setInvoices([]);
      return;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get(`/cases/${selectedCaseId}/invoices`);
        const rows = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (!alive) return;

        setInvoices(rows);
        setPage(1);

        // ✅ if none → show modal
        if (!rows || rows.length === 0) {
          setShowNoInvoiceModal(true);
        }
      } catch (e) {
        if (!alive) return;
        setInvoices([]);
        setErr(e?.response?.data?.message || "Failed to load invoices.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [api, selectedCaseId]);

  const selectedCase = useMemo(
    () => cases.find((c) => c._id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const filtered = useMemo(() => {
    const minN = minTotal === "" ? null : toNum(minTotal, 0);
    const maxN = maxTotal === "" ? null : toNum(maxTotal, 0);
    const fromT = dateFrom ? new Date(dateFrom).getTime() : null;
    const toT = dateTo ? new Date(dateTo).getTime() + 24 * 3600 * 1000 - 1 : null;

    let rows = [...(invoices || [])];

    rows = rows.filter((inv) => {
      const invNo = inv.invoiceNumber || inv.invoiceId || inv._id;
      const status = inv.payment_status || "unpaid";
      const total = toNum(inv.grand_total, 0);
      const createdAt = inv.createdAt ? new Date(inv.createdAt).getTime() : 0;

      if (
        q &&
        !(
          matchText(invNo, q) ||
          matchText(inv.patient_name, q) ||
          matchText(inv.p_id, q) ||
          matchText(inv.patient_phone, q)
        )
      ) {
        return false;
      }

      if (paymentStatus !== "all" && status !== paymentStatus) return false;
      if (minN != null && total < minN) return false;
      if (maxN != null && total > maxN) return false;
      if (fromT != null && createdAt < fromT) return false;
      if (toT != null && createdAt > toT) return false;

      return true;
    });

    const [key, dir] = String(sortBy).split("_");
    rows.sort((a, b) => {
      const av = key === "grandTotal" ? toNum(a.grand_total, 0) : new Date(a.createdAt || 0).getTime();
      const bv = key === "grandTotal" ? toNum(b.grand_total, 0) : new Date(b.createdAt || 0).getTime();
      return dir === "asc" ? av - bv : bv - av;
    });

    return rows;
  }, [invoices, q, paymentStatus, minTotal, maxTotal, dateFrom, dateTo, sortBy]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length]);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, x) => s + toNum(x.grand_total, 0), 0);
    const due = filtered.reduce((s, x) => s + toNum(x.amount_due, 0), 0);
    const paid = filtered.reduce((s, x) => s + toNum(x.amount_paid, 0), 0);
    return {
      count: filtered.length,
      total: round2(total),
      paid: round2(paid),
      due: round2(due),
    };
  }, [filtered]);

  const onSelectCase = (cid) => {
    const next = new URLSearchParams(searchParams);
    if (cid) next.set("caseId", cid);
    else next.delete("caseId");
    setSearchParams(next, { replace: true });
  };

  const onGenerateInvoice = () => {
    if (!selectedCaseId) return;
    setShowNoInvoiceModal(false);
    navigate(`/admin/billing/generate-bill/${selectedCaseId}`);
  };

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-10 bg-gradient-to-b from-slate-50 to-white">
      {/* ✅ Modal */}
      <NoInvoiceModal
        open={showNoInvoiceModal && !!selectedCaseId && !loading && !err}
        onClose={() => setShowNoInvoiceModal(false)}
        onGenerate={onGenerateInvoice}
        patientName={selectedCase?.patient_name || ""}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Billing</div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Invoices</h1>
            <div className="mt-1 text-sm text-slate-600">
              Select a case → view invoices → open invoice to see details.
            </div>
          </div>
        </div>

        {(casesError || err) ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {casesError || err}
          </div>
        ) : null}

        {/* Case selector */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-1">
              <div className="text-xs font-semibold text-slate-600 mb-2">Search Case</div>
              <input
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                placeholder="Patient name / phone / p_id..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="text-xs text-slate-500 mt-2">
                {casesLoading ? "Loading cases..." : `${cases.length} cases`}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="text-xs font-semibold text-slate-600 mb-2">Select Case</div>
              <select
                value={selectedCaseId}
                onChange={(e) => onSelectCase(e.target.value)}
                disabled={casesLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Choose a case…</option>
                {cases.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.patient_name} • {c.p_id || "—"} • {c.patient_phone || "—"}
                  </option>
                ))}
              </select>

              {selectedCase ? (
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                  <span>
                    Patient: <span className="font-semibold text-slate-800">{selectedCase.patient_name}</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <Link
                    className="text-indigo-600 underline"
                    to={`/admin/case-details/${selectedCaseId}`}
                    target="_blank"
                  >
                    View case
                  </Link>

                  {/* ✅ Helpful quick action (optional) */}
                  {invoices.length === 0 && !loading ? (
                    <>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => setShowNoInvoiceModal(true)}
                        className="text-emerald-700 font-semibold underline"
                      >
                        Generate invoice
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="font-bold text-slate-900">Filters</div>
            <div className="flex gap-2 flex-wrap">
              <Badge tone="indigo">Count: {stats.count}</Badge>
              <Badge tone="slate">Total: {inr(stats.total)}</Badge>
              <Badge tone="emerald">Paid: {inr(stats.paid)}</Badge>
              <Badge tone="amber">Due: {inr(stats.due)}</Badge>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-slate-600 mb-1">Search</div>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Invoice no / patient / phone / p_id..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Payment Status</div>
              <select
                value={paymentStatus}
                onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="all">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overpaid">Overpaid</option>
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Min Total</div>
              <input
                value={minTotal}
                onChange={(e) => { setMinTotal(e.target.value); setPage(1); }}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Max Total</div>
              <input
                value={maxTotal}
                onChange={(e) => { setMaxTotal(e.target.value); setPage(1); }}
                placeholder="999999"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Sort</div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="createdAt_desc">Newest</option>
                <option value="createdAt_asc">Oldest</option>
                <option value="grandTotal_desc">Total High → Low</option>
                <option value="grandTotal_asc">Total Low → High</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <div className="text-xs font-semibold text-slate-600 mb-1">From</div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="md:col-span-3">
              <div className="text-xs font-semibold text-slate-600 mb-1">To</div>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Listing */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">Invoice listing</div>
              <div className="text-xs text-slate-500">
                {loading ? "Loading…" : selectedCaseId ? `${filtered.length} invoices (filtered)` : "Select a case to view invoices"}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Page {page} / {pageCount}
            </div>
          </div>

          {!selectedCaseId ? (
            <div className="p-6 text-slate-600">Select a case to see invoices.</div>
          ) : loading ? (
            <div className="p-6 text-slate-600">Loading invoices…</div>
          ) : !filtered.length ? (
            <div className="p-6 text-slate-600">
              No invoices found for current filters.
              <div className="mt-3">
                <button
                  onClick={() => setShowNoInvoiceModal(true)}
                  className="px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 font-semibold text-emerald-700"
                >
                  Generate Invoice
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b bg-slate-50">
                    <th className="py-3 px-4">Invoice</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Totals</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 w-36">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((inv) => {
                    const invId = inv.invoiceId || inv._id;
                    const invNo = inv.invoiceNumber || invId;
                    const status = inv.payment_status || "unpaid";
                    const due = toNum(inv.amount_due, 0);

                    const tone =
                      status === "paid" ? "emerald" :
                      status === "partial" ? "amber" :
                      status === "overpaid" ? "indigo" : "red";

                    return (
                      <tr key={invId} className="border-b last:border-b-0 hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{invNo}</div>
                          <div className="mt-1 flex gap-2 flex-wrap">
                            <Badge tone={tone}>{status.toUpperCase()}</Badge>
                            <Badge tone="slate">Items: {(inv.items || []).length}</Badge>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{inv.patient_name || "—"}</div>
                          <div className="text-xs text-slate-500">{inv.p_id || "—"} • {inv.patient_phone || "—"}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{inr(inv.grand_total || 0)}</div>
                          <div className="text-xs text-slate-500">
                            Subtotal: {inr(inv.subtotal || 0)} • Discount: {inr(inv.total_discount || 0)}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-900">
                            <span className="font-semibold">Paid:</span> {inr(inv.amount_paid || 0)}
                          </div>
                          <div className={`text-xs ${due > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                            Due: {inr(due)}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-700">{safeDate(inv.createdAt)}</td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => navigate(`/admin/invoices/${invId}`)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {selectedCaseId && filtered.length > 0 ? (
            <div className="px-5 py-4 border-t bg-white flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-slate-500">
                Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </div>

              <div className="flex gap-2">
                <button
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm disabled:opacity-50"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
