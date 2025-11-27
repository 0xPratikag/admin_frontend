import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const rupee = (n) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const pageSizeDefault = 12;

const safeLower = (v) => (v == null ? "" : String(v).toLowerCase());
const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toString() === "Invalid Date" ? "—" : d.toLocaleString("en-IN");
};
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toString() === "Invalid Date"
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState("");
  // 🔧 backend statuses are: success | failed | initiated
  const [status, setStatus] = useState("all"); // success | failed | initiated | all
  const [mode, setMode] = useState("all"); // online | offline | all
  const [provider, setProvider] = useState("all");
  const [startDate, setStartDate] = useState(""); // yyyy-mm-dd
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("date_desc"); // date_desc | date_asc | amt_desc | amt_asc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");
      const baseURL = import.meta.env.VITE_API_BASE_URL;

      const res = await axios.get(`${baseURL}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 🔧 handle both shapes: raw array OR { count, transactions: [...] }
      const payload = res.data;
      const rows = Array.isArray(payload) ? payload : (payload?.transactions || []);
      setTransactions(rows);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // derive provider list
  const providers = useMemo(() => {
    const set = new Set(
      transactions
        .map((t) => (t.provider || "").trim())
        .filter((v) => v && v !== "N/A")
    );
    return ["all", ...Array.from(set)];
  }, [transactions]);

  // filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    // include the whole end day
    const end = endDate ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1) : null;
    const min = minAmount === "" ? null : Number(minAmount);
    const max = maxAmount === "" ? null : Number(maxAmount);

    return transactions.filter((t) => {
      // normalize common ids
      const txnId = safeLower(t._id);
      const billId =
        typeof t.billingId === "string"
          ? safeLower(t.billingId)
          : safeLower(t.billingId?._id);
      const caseId =
        typeof t.caseId === "string"
          ? safeLower(t.caseId)
          : safeLower(t.caseId?._id);
      const pId =
        typeof t.caseId === "object" ? safeLower(t.caseId?.p_id) : "";

      // search over Txn ID, Billing ID, Case ID, P.ID, transactionId (if any), provider, mode
      const hay = [
        txnId,
        billId,
        caseId,
        pId,
        safeLower(t.transactionId),
        safeLower(t.provider),
        safeLower(t.paymentMode),
      ].join(" ");

      if (q && !hay.includes(q)) return false;

      // 🔧 match backend status "initiated" instead of "pending"
      if (status !== "all" && t.status !== status) return false;
      if (mode !== "all" && (t.paymentMode || "").toLowerCase() !== mode) return false;
      if (provider !== "all" && (t.provider || "") !== provider) return false;

      const tDate = new Date(t.createdAt);
      if (start && tDate < start) return false;
      if (end && tDate > end) return false;

      const amt = Number(t.amount) || 0;
      if (min !== null && amt < min) return false;
      if (max !== null && amt > max) return false;

      return true;
    });
  }, [transactions, search, status, mode, provider, startDate, endDate, minAmount, maxAmount]);

  // sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "date_asc":
        arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "amt_desc":
        arr.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
        break;
      case "amt_asc":
        arr.sort((a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0));
        break;
      case "date_desc":
      default:
        arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return arr;
  }, [filtered, sortBy]);

  // pagination
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(startIdx, startIdx + pageSize);

  useEffect(() => {
    // reset to page 1 whenever filters change
    setPage(1);
  }, [search, status, mode, provider, startDate, endDate, minAmount, maxAmount, sortBy, pageSize]);

  // stats
  const totalVolume = useMemo(
    () => filtered.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [filtered]
  );
  const successCount = useMemo(
    () => filtered.filter((t) => t.status === "success").length,
    [filtered]
  );
  const successRate = filtered.length
    ? Math.round((successCount / filtered.length) * 100)
    : 0;

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setMode("all");
    setProvider("all");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setSortBy("date_desc");
    setPageSize(pageSizeDefault);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-72 bg-white/10 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-white/10 rounded-xl" />
              ))}
            </div>
            <div className="h-12 bg-white/10 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-white/10 rounded-2xl" />
              ))}
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
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 rounded-2xl p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              💹 Transactions
            </h2>
            <p className="text-slate-300 text-sm">
              Real-time transaction center with filters & analytics
            </p>
          </div>

          {/* Search */}
          <div className="w-full sm:w-96">
            <input
              type="text"
              placeholder="Search Txn/Billing/Case/P.ID/Provider/Mode…"
              className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/70"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Transactions"
            value={filtered.length}
            accent="from-cyan-400 to-sky-500"
          />
          <StatCard
            label="Volume"
            value={rupee(totalVolume)}
            accent="from-fuchsia-400 to-pink-500"
          />
          <StatCard
            label="Success Rate"
            value={`${successRate}%`}
            accent="from-emerald-400 to-lime-500"
          />
        </div>

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-4 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {/* 🔧 include 'initiated' instead of 'pending' */}
              <option value="all" className="text-blue-900">Status: All</option>
              <option value="success" className="text-blue-900">Success</option>
              <option value="initiated" className="text-blue-900">Initiated</option>
              <option value="failed" className="text-blue-900">Failed</option>
            </select>

            <select
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="all" className="text-blue-900">Mode: All</option>
              <option value="online" className="text-blue-900">Online</option>
              <option value="offline" className="text-blue-900">Offline</option>
            </select>

            <select
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p} value={p} className="text-blue-900">
                  Provider: {p === "all" ? "All" : p}
                </option>
              ))}
            </select>

            <select
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_desc" className="text-blue-900">Sort: Newest</option>
              <option value="date_asc" className="text-blue-900">Sort: Oldest</option>
              <option value="amt_desc" className="text-blue-900">Sort: Amount High → Low</option>
              <option value="amt_asc" className="text-blue-900">Sort: Amount Low → High</option>
            </select>
          </div>

        </motion.div>

        {/* Cards */}
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pageRows.map((txn) => {
              const billId =
                typeof txn.billingId === "string"
                  ? txn.billingId
                  : txn.billingId?._id;
              const billDate =
                typeof txn.billingId === "object"
                  ? txn.billingId?.bill_date
                  : null;
              const casePid =
                typeof txn.caseId === "object" ? txn.caseId?.p_id : "";

              return (
                <motion.button
                  key={txn._id}
                  onClick={() =>
                    window.open(`/admin/transaction-details/${txn._id}`, "_blank")
                  }
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className="text-left cursor-pointer rounded-2xl p-4 border border-white/10 bg-white/[0.06] backdrop-blur shadow-[0_0_0_1px_rgba(255,255,255,0.06)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.25)] transition"
                >
                  {/* Top: Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-slate-300 text-xs">Txn ID</div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        txn.status === "success"
                          ? "bg-emerald-400/20 text-emerald-300"
                          : txn.status === "failed"
                          ? "bg-rose-400/20 text-rose-300"
                          : "bg-amber-400/20 text-amber-300"
                      }`}
                    >
                      {txn.status}
                    </span>
                  </div>
                  <div className="font-mono text-[13px] text-white truncate">
                    {txn._id}
                  </div>

                  {/* P.ID + Billing ID */}
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>P.ID</span>
                      <code className="bg-white/10 border border-white/15 text-slate-100 px-1.5 py-0.5 rounded">
                        {casePid || "N/A"}
                      </code>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Billing ID</span>
                      <code className="bg-white/10 border border-white/15 text-slate-100 px-1.5 py-0.5 rounded">
                        {billId || "N/A"}
                      </code>
                    </div>
                  </div>

                  {/* Amount / Mode / Provider */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-slate-300 text-sm">Amount</div>
                    <div className="text-white font-semibold">
                      {rupee(txn.amount)}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <div className="text-slate-300">
                      Mode:{" "}
                      <span className="capitalize text-white">
                        {txn.paymentMode || "—"}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      Provider: <span className="text-white">{txn.provider || "—"}</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mt-1 text-slate-300 text-[11px]">
                    Bill Date:{" "}
                    <span className="text-slate-100">{formatDate(billDate)}</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    Created:{" "}
                    <span className="text-slate-100">
                      {formatDateTime(txn.createdAt)}
                    </span>
                  </div>
                </motion.button>
              );
            })}

            {pageRows.length === 0 && (
              <div className="col-span-full text-center text-slate-300">
                No transactions match your filters.
              </div>
            )}
          </div>
        </AnimatePresence>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between text-slate-300">
          <div>
            Showing{" "}
            <span className="text-white font-semibold">
              {pageRows.length}
            </span>{" "}
            of <span className="text-white font-semibold">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-white disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              ← Prev
            </button>
            <span className="px-2">
              Page{" "}
              <span className="text-white font-semibold">{currentPage}</span> /{" "}
              <span className="text-white font-semibold">{totalPages}</span>
            </span>
            <button
              className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-white disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ======= tiny stat card with animated value ======= */
const StatCard = ({ label, value, accent = "from-cyan-400 to-sky-500" }) => (
  <motion.div
    initial={{ y: 16, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className={`rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur p-4 shadow relative overflow-hidden`}
  >
    <div
      className={`pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${accent} blur-2xl opacity-40`}
    />
    <div className="text-slate-300 text-sm">{label}</div>
    <motion.div
      key={String(value)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="text-2xl font-extrabold text-white tracking-tight"
    >
      {value}
    </motion.div>
  </motion.div>
);

export default TransactionList;
