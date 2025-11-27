import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import InvoicePreview from "./InvoicePreview";

const rupee = (n) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const prettyDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN") : "—");
const prettyDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const title = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");
const getId = (maybeIdOrObj) =>
  typeof maybeIdOrObj === "string" ? maybeIdOrObj : maybeIdOrObj?._id || "";

const TransactionDetails = () => {
  const { id } = useParams();

  const token = localStorage.getItem("token");
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  const [transaction, setTransaction] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [error, setError] = useState(null);

  // Related transactions
  const [allTxns, setAllTxns] = useState([]);
  const [relSearch, setRelSearch] = useState("");
  const [relStatus, setRelStatus] = useState("all"); // success | failed | initiated | all
  const [relMode, setRelMode] = useState("all"); // online | offline | all
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${baseURL}/transactions/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransaction(res?.data?.transaction || null);
      } catch (err) {
        setError(err.response?.data?.error || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    const fetchAllTransactions = async () => {
      try {
        const res = await axios.get(`${baseURL}/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = res.data;
        const rows = Array.isArray(payload)
          ? payload
          : payload?.transactions || [];
        setAllTxns(rows);
      } catch {
        // not fatal
      }
    };

    fetchTransaction();
    fetchAllTransactions();
  }, [id, baseURL, token]);

  // Lazy fetch invoice preview when user opens it — by CASE (optionally locked to this bill)
  useEffect(() => {
    const loadInvoice = async () => {
      const cId = getId(transaction?.caseId);
      const bId = getId(transaction?.billingId);
      if (!showPreview || !cId) return;
      setInvoiceLoading(true);
      try {
        const url = bId
          ? `${baseURL}/invoice/by-case/${cId}?billingId=${bId}`
          : `${baseURL}/invoice/by-case/${cId}`;
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInvoiceData(res.data || null);
      } catch {
        setInvoiceData(null);
      } finally {
        setInvoiceLoading(false);
      }
    };
    loadInvoice();
  }, [showPreview, transaction?.caseId, transaction?.billingId, baseURL, token]);

  // Normalized/derived fields
  const billId = useMemo(() => getId(transaction?.billingId), [transaction]);
  const billDate = useMemo(
    () =>
      typeof transaction?.billingId === "object"
        ? transaction?.billingId?.bill_date
        : undefined,
    [transaction]
  );
  const caseId = useMemo(() => getId(transaction?.caseId), [transaction]);
  const pId = useMemo(
    () =>
      typeof transaction?.caseId === "object" ? transaction?.caseId?.p_id : "",
    [transaction]
  );
  const mode = useMemo(
    () => transaction?.paymentMode || transaction?.payment_mode || "—",
    [transaction]
  );
  const provider = transaction?.provider || "N/A";

  // Related: same bill or same case (normalize ids)
  const relatedPool = useMemo(() => {
    if (!transaction) return [];
    const myBill = billId;
    const myCase = caseId;
    const same =
      allTxns.filter((t) => {
        const tBill = getId(t.billingId);
        const tCase = getId(t.caseId);
        return (
          t._id !== transaction._id && (tBill === myBill || tCase === myCase)
        );
      }) || [];
    const recent = [...allTxns]
      .filter((t) => t._id !== transaction._id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12);
    return same.length ? same : recent;
  }, [allTxns, transaction, billId, caseId]);

  const filteredRelated = useMemo(() => {
    const q = relSearch.trim().toLowerCase();
    return relatedPool.filter((t) => {
      const hay = `${t._id} ${getId(t.billingId)} ${getId(t.caseId)} ${t.transactionId || ""} ${t.provider || ""} ${t.paymentMode || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (relStatus !== "all" && t.status !== relStatus) return false;
      if (relMode !== "all" && (t.paymentMode || "").toLowerCase() !== relMode)
        return false;
      return true;
    });
  }, [relatedPool, relSearch, relStatus, relMode]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      alert("Copied!");
    } catch {}

  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 ">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-64 bg-white/10 rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 h-80 bg-white/10 rounded-2xl" />
              <div className="h-80 bg-white/10 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6">
        <div className="max-w-3xl mx-auto text-center text-red-200 bg-red-900/30 border border-red-500/30 rounded-xl p-4">
          Error: {error}
        </div>
      </div>
    );
  }
  if (!transaction) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6">
        <div className="max-w-3xl mx-auto text-center text-slate-200">
          No transaction found.
        </div>
      </div>
    );
  }

  const statusPill =
    transaction.status === "success"
      ? "bg-emerald-400/20 text-emerald-300"
      : transaction.status === "failed"
      ? "bg-rose-400/20 text-rose-300"
      : "bg-amber-400/20 text-amber-300"; // initiated or any other

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 rounded-2xl">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                🧾 Transaction Details
              </h2>
              <p className="text-slate-300 text-sm font-mono">Txn: #{transaction._id}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                <CodePill label="P.ID" value={pId || "N/A"} onCopy={() => copy(pId)} />
                <CodePill label="Billing ID" value={billId || "N/A"} onCopy={() => copy(billId)} />
                <CodePill label="Case ID" value={caseId || "N/A"} onCopy={() => copy(caseId)} />
                {billDate && (
                  <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200">
                    Bill Date: {prettyDate(billDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Toolbar (Download Invoice button removed) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => copy(transaction._id)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                title="Copy Transaction ID"
              >
                Copy ID
              </button>
              {billId && (
                <button
                  onClick={() =>
                    window.open(`/admin/bill-details/${billId}`, "_blank")
                  }
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]"
                >
                  View Bill
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT: Main card */}
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          >
            {/* Amount + Status */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-slate-300 text-sm">Amount Paid</div>
                <div className="text-4xl font-extrabold text-white">
                  {rupee(transaction.amount)}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusPill}`}>
                {title(transaction.status)}
              </span>
            </div>

            {/* Grid Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard
                title="Payment Information"
                items={[
                  ["Payment Mode", title(mode)],
                  ["Provider", provider || "—"],
                  ["Gateway Txn ID", transaction.transactionId || "—"],
                ]}
                accent="from-cyan-400 to-sky-500"
              />
              <InfoCard
                title="References"
                items={[
                  ["Billing ID", billId || "—"],
                  ["Case ID", caseId || "—"],
                  ["P.ID", pId || "—"],
                ]}
                accent="from-emerald-400 to-lime-500"
              />
              <InfoCard
                title="Meta"
                items={[
                  ["Notes", transaction.notes || "—"],
                  ["Bill Date", prettyDate(billDate)],
                  ["Created", prettyDateTime(transaction.createdAt)],
                  ["Updated", prettyDateTime(transaction.updatedAt)],
                ]}
                accent="from-fuchsia-400 to-pink-500"
              />

              {/* Invoice preview (optional) */}
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-100 font-semibold">Invoice Preview</h3>
                  <button
                    onClick={() => setShowPreview((s) => !s)}
                    className="text-slate-300 hover:text-white text-sm"
                  >
                    {showPreview ? "Hide" : "Show"}
                  </button>
                </div>
                <AnimatePresence>
                  {showPreview && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="rounded-lg bg-white/5 border border-white/10 p-3"
                    >
                      {invoiceLoading ? (
                        <div className="text-slate-300 text-sm">Loading preview…</div>
                      ) : invoiceData ? (
                        <InvoicePreview data={invoiceData} />
                      ) : (
                        <div className="text-slate-300 text-sm">
                          Invoice data not available.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Related / Filters */}
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          >
            <div className="mb-3">
              <h3 className="text-slate-100 font-semibold">Related Transactions</h3>
              <p className="text-slate-400 text-xs">Same bill/case, or recent activity</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 mb-3">
              <input
                type="text"
                placeholder="Search ID / Billing / Case / Provider / Mode…"
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-slate-300"
                value={relSearch}
                onChange={(e) => setRelSearch(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white"
                  value={relStatus}
                  onChange={(e) => setRelStatus(e.target.value)}
                >
                  <option value="all" className="text-blue-900">Status: All</option>
                  <option value="success" className="text-blue-900">Success</option>
                  <option value="initiated" className="text-blue-900">Initiated</option>
                  <option value="failed" className="text-blue-900">Failed</option>
                </select>
                <select
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white"
                  value={relMode}
                  onChange={(e) => setRelMode(e.target.value)}
                >
                  <option value="all" className="text-blue-900">Mode: All</option>
                  <option value="online" className="text-blue-900">Online</option>
                  <option value="offline" className="text-blue-900">Offline</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 max-h-[28rem] overflow-auto pr-1">
              <AnimatePresence>
                {filteredRelated.map((t) => {
                  const rBillId = getId(t.billingId);
                  const rCaseId = getId(t.caseId);
                  const rPid = typeof t.caseId === "object" ? t.caseId?.p_id : "";
                  const rBillDate =
                    typeof t.billingId === "object" ? t.billingId?.bill_date : null;

                  return (
                    <motion.button
                      key={t._id}
                      onClick={() =>
                        window.open(`/admin/transaction-details/${t._id}`, "_blank")
                      }
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="w-full text-left rounded-xl border border-white/10 bg-white/[0.05] p-3 hover:bg-white/[0.08] transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-slate-200 text-sm font-mono truncate pr-2">
                          {t._id}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            t.status === "success"
                              ? "bg-emerald-400/20 text-emerald-300"
                              : t.status === "failed"
                              ? "bg-rose-400/20 text-rose-300"
                              : "bg-amber-400/20 text-amber-300"
                          }`}
                        >
                          {title(t.status)}
                        </span>
                      </div>

                      {/* IDs row */}
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                        <MiniCode label="P.ID" value={rPid || "N/A"} />
                        <MiniCode label="Bill" value={rBillId || "N/A"} />
                        <MiniCode label="Case" value={rCaseId || "N/A"} />
                      </div>

                      <div className="mt-1 text-slate-300 text-xs">
                        {rupee(t.amount)} •{" "}
                        <span className="capitalize">{t.paymentMode || "—"}</span> •{" "}
                        <span>{t.provider || "—"}</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {rBillDate ? `Bill: ${prettyDate(rBillDate)} • ` : ""}
                        {prettyDateTime(t.createdAt)}
                      </div>
                    </motion.button>
                  );
                })}
                {filteredRelated.length === 0 && (
                  <div className="text-slate-300 text-sm py-6 text-center">
                    No related transactions match your filters.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ======= small info card with animated accent ======= */
const InfoCard = ({ title, items, accent = "from-cyan-400 to-sky-500" }) => (
  <div className="relative rounded-xl border border-white/10 bg-white/[0.05] p-4 overflow-hidden">
    <div
      className={`pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${accent} blur-2xl opacity-30`}
    />
    <h3 className="text-slate-100 font-semibold mb-2">{title}</h3>
    <div className="space-y-1">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-3">
          <div className="text-slate-300 text-sm">{k}</div>
          <div className="text-white text-sm font-medium text-right break-all">
            {v}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ======= tiny code pill ======= */
const CodePill = ({ label, value, onCopy }) => (
  <div className="flex items-center gap-1">
    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200 font-mono text-xs">
      {label}: {value}
    </span>
    <button
      onClick={onCopy}
      className="text-slate-300 hover:text-white text-xs px-1"
      title={`Copy ${label}`}
    >
      Copy
    </button>
  </div>
);

/* ======= tiny inline code ======= */
const MiniCode = ({ label, value }) => (
  <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200 font-mono">
    {label}:{value}
  </span>
);

export default TransactionDetails;
