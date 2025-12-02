// src/pages/ViewAllBills.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

const statusColor = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(n || 0));

const Chip = ({ className = "", children }) => (
  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${className}`}>
    {children}
  </span>
);

const Progress = ({ value }) => (
  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
    <div
      className="h-2 bg-emerald-500"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// safely parse numeric filter inputs
const parseNumber = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

// Helper: get client id from bill object in a flexible way
const getClientId = (bill) =>
  bill?.client_id ||
  bill?.clientId ||
  bill?.caseId?.client_id ||
  bill?.caseId?.clientId ||
  bill?.caseId?.p_id || // fallback
  "";

// Helper: get therapy type from bill
const getTherapyType = (bill) =>
  bill?.therapy_type ||
  bill?.therapyType ||
  bill?.caseId?.therapy_type ||
  bill?.summary?.therapy_type ||
  "";

// Helper: get number of sessions
const getSessions = (bill) =>
  bill?.number_of_sessions ||
  bill?.sessions ||
  bill?.no_of_sessions ||
  bill?.summary?.sessions ||
  "";

// ---------------- BILL CARD ----------------

const BillCard = ({ bill }) => {
  const navigate = useNavigate();
  const {
    _id,
    summary,
    total_amount,
    paid_amount = 0,
    payment_status,
    bill_date,
    due_date,
    createdAt,
    updatedAt, // may be undefined
    caseId,
    adminId,
  } = bill || {};

  const amount = Number(summary?.grand_total ?? total_amount ?? 0);
  const paid = Number(paid_amount || 0);
  const remaining = Math.max(0, amount - paid);
  const pct = amount > 0 ? (paid / amount) * 100 : 0;

  const patientName = caseId?.patient_name || "Unknown Patient";
  const pId = caseId?.p_id || "N/A";
  const case_id = caseId?._id || "N/A";
  const branch = adminId?.Branch_name || "N/A";
  const phone = caseId?.patient_phone || "N/A";

  const therapyType = getTherapyType(bill) || "—";
  const sessions = getSessions(bill) || "—";
  const clientId = getClientId(bill) || "—";

  const openBill = () => navigate(`/admin/bill-details/${_id}`);

  return (
    <motion.div
      onClick={openBill}
      className="cursor-pointer bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3
            className="text-base font-semibold text-slate-800 truncate pr-2"
            title={patientName}
          >
            {patientName}
          </h3>
          <Chip
            className={`${
              statusColor[payment_status] || "bg-slate-100 text-slate-700"
            } capitalize`}
          >
            {payment_status || "pending"}
          </Chip>
        </div>

        {/* Therapy + Sessions + Client */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
          <div>
            <div className="text-slate-500">Therapy Type</div>
            <div className="font-medium truncate" title={therapyType}>
              {therapyType}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-500">Sessions</div>
            <div className="font-medium">{sessions}</div>
          </div>
          <div>
            <div className="text-slate-500">Client ID</div>
            <div className="font-medium">{clientId}</div>
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 mt-1">
          <div>
            <div className="text-slate-500">Grand Total</div>
            <div className="font-semibold">{inr(amount)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500">Paid</div>
            <div className="font-semibold">{inr(paid)}</div>
          </div>
          <div>
            <div className="text-slate-500">Remaining</div>
            <div className="font-semibold">{inr(remaining)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500">Progress</div>
            <div className="font-semibold">{Math.round(pct)}%</div>
          </div>
        </div>

        <Progress value={pct} />

        {/* Dates */}
        <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-700">
          <div>
            <div className="text-slate-500">Bill Date</div>
            <div className="font-medium">{formatDate(bill_date)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500">Due Date</div>
            <div className="font-medium">{formatDate(due_date)}</div>
          </div>
          <div>
            <div className="text-slate-500">Created</div>
            <div className="font-medium">{formatDate(createdAt)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500">Updated</div>
            <div className="font-medium">{formatDate(updatedAt)}</div>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-1 space-y-1 text-[11px] text-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Bill ID</span>
            <code className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-800">{_id}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">P.ID</span>
            <code className="bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-700">{pId}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Case ID</span>
            <code className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-800">{case_id}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Branch</span>
            <span className="font-medium">{branch}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Phone</span>
            <span className="font-medium">{phone}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ---------------- MAIN PAGE ----------------

const ViewAllBills = () => {
  const location = useLocation();
  const pinnedPId = location?.state?.p_id || "";
  const pinnedCaseId = location?.state?.case_id || "";

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [therapyTypeFilter, setTherapyTypeFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [minDue, setMinDue] = useState("");
  const [maxDue, setMaxDue] = useState("");

  const fetchBills = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/view-bills`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const sorted = Array.isArray(data)
        ? [...data].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        : [];
      setBills(sorted);
    } catch (err) {
      console.error("Error fetching bills:", err);
      setError("Failed to load bills. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // unique therapy type options for dropdown
  const therapyTypes = useMemo(() => {
    const set = new Set();
    (bills || []).forEach((b) => {
      const t = (getTherapyType(b) || "").trim();
      if (t) set.add(t);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bills]);

  // filters
  const filteredBills = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();

    const minAmt = parseNumber(minAmount);
    const maxAmt = parseNumber(maxAmount);
    const minDueAmt = parseNumber(minDue);
    const maxDueAmt = parseNumber(maxDue);

    return (bills || []).filter((b) => {
      const billId = String(b?._id || "").toLowerCase();
      const caseId = String(b?.caseId?._id || "").toLowerCase();
      const pid = String(b?.caseId?.p_id || "").toLowerCase();
      const name = String(b?.caseId?.patient_name || "").toLowerCase();
      const phone = String(b?.caseId?.patient_phone || "").toLowerCase();
      const status = String(b?.payment_status || "").toLowerCase();

      if (pinnedPId && pid !== pinnedPId.toLowerCase()) return false;
      if (pinnedCaseId && caseId !== pinnedCaseId.toLowerCase()) return false;

      // status filter
      if (statusFilter !== "all" && status !== statusFilter) return false;

      // therapy type filter
      const therapyType = (getTherapyType(b) || "").toLowerCase();
      if (
        therapyTypeFilter !== "all" &&
        therapyType !== therapyTypeFilter.toLowerCase()
      )
        return false;

      const amount = Number(b?.summary?.grand_total ?? b?.total_amount ?? 0);
      const paid = Number(b?.paid_amount || 0);
      const remaining = Math.max(0, amount - paid);

      if (minAmt !== null && amount < minAmt) return false;
      if (maxAmt !== null && amount > maxAmt) return false;

      if (minDueAmt !== null && remaining < minDueAmt) return false;
      if (maxDueAmt !== null && remaining > maxDueAmt) return false;

      if (!q) return true;
      return (
        billId.includes(q) ||
        caseId.includes(q) ||
        pid.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        status.includes(q)
      );
    });
  }, [
    bills,
    searchTerm,
    pinnedPId,
    pinnedCaseId,
    statusFilter,
    therapyTypeFilter,
    minAmount,
    maxAmount,
    minDue,
    maxDue,
  ]);

  const hasPin = Boolean(pinnedPId || pinnedCaseId);

  // EXPORT FILTERED DATA TO CSV (Excel)
  const handleExport = () => {
    if (!filteredBills || filteredBills.length === 0) return;

    const header = [
      "Client ID",
      "Therapy Type",
      "Number of Sessions",
      "Total Amount",
      "Paid Amount",
      "Due Amount",
      "Bill Date",
      // helpful extra cols
      "Payment Status",
      "Bill ID",
      "Branch",
      "Phone",
    ];

    const rows = filteredBills.map((b) => {
      const amount = Number(b?.summary?.grand_total ?? b?.total_amount ?? 0);
      const paid = Number(b?.paid_amount || 0);
      const remaining = Math.max(0, amount - paid);

      const clientId = getClientId(b);
      const therapyType = getTherapyType(b);
      const sessions = getSessions(b);

      const status = b?.payment_status || "";
      const billId = b?._id || "";
      const branch = b?.adminId?.Branch_name || "";
      const phone = b?.caseId?.patient_phone || "";

      return [
        clientId,
        therapyType,
        sessions,
        amount,
        paid,
        remaining,
        formatDate(b?.bill_date), // text date => Excel me #### nahi aayega
        status,
        billId,
        branch,
        phone,
      ];
    });

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((val) => {
            const v = val === null || val === undefined ? "" : String(val);
            if (v.includes(",") || v.includes('"') || v.includes("\n")) {
              return `"${v.replace(/"/g, '""')}"`;
            }
            return v;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bills_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTherapyTypeFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setMinDue("");
    setMaxDue("");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* HEADER + SEARCH + EXPORT */}
        <motion.div
          className="border-b border-sky-200 pb-4 mb-6 flex flex-col gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-sky-700">
                🧾 All Bills
              </h2>
              <p className="text-slate-500 text-sm">
                Showing {filteredBills.length} of {bills.length}
              </p>
              {hasPin && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {pinnedPId ? (
                    <Chip className="bg-indigo-50 text-indigo-700">
                      Filtered by P.ID:{" "}
                      <span className="font-semibold ml-1">{pinnedPId}</span>
                    </Chip>
                  ) : null}
                  {pinnedCaseId ? (
                    <Chip className="bg-slate-100 text-slate-800">
                      Filtered by Case ID:{" "}
                      <span className="font-semibold ml-1">{pinnedCaseId}</span>
                    </Chip>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="🔍 Search name/phone/P.ID/case ID/bill ID..."
                className="w-full sm:w-96 px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <button
                type="button"
                onClick={handleExport}
                disabled={!filteredBills.length}
                className={`px-4 py-2 rounded-md text-sm font-medium shadow-sm border transition-all ${
                  filteredBills.length
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
                    : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                }`}
              >
                ⬇ Export Excel (CSV)
              </button>
            </div>
          </div>

          {/* FILTER BAR */}
          <div className="mt-3 bg-white/80 border border-slate-200 rounded-lg p-3 flex flex-col gap-3 text-xs sm:text-sm">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Status */}
              <div className="flex flex-col gap-1 w-full lg:w-1/4">
                <label className="text-slate-500 font-medium">Status</label>
                <select
                  className="border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Therapy Type */}
              <div className="flex flex-col gap-1 w-full lg:w-1/4">
                <label className="text-slate-500 font-medium">
                  Therapy Type
                </label>
                <select
                  className="border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={therapyTypeFilter}
                  onChange={(e) => setTherapyTypeFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {therapyTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Amount Range */}
              <div className="flex flex-col gap-1 w-full lg:w-1/3">
                <label className="text-slate-500 font-medium">
                  Total Amount (₹)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    className="w-1/2 border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    className="w-1/2 border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Due Amount Range */}
              <div className="flex flex-col gap-1 w-full lg:w-1/3">
                <label className="text-slate-500 font-medium">
                  Due / Remaining Amount (₹)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    className="w-1/2 border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={minDue}
                    onChange={(e) => setMinDue(e.target.value)}
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    className="w-1/2 border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={maxDue}
                    onChange={(e) => setMaxDue(e.target.value)}
                  />
                </div>
              </div>

              {/* Clear filters */}
              <div className="flex items-end w-full lg:w-auto">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="w-full lg:w-auto px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 text-xs sm:text-sm font-medium hover:bg-slate-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {loading && (
          <div className="text-center text-slate-500">Loading bills...</div>
        )}
        {error && <div className="text-center text-red-600">{error}</div>}
        {!loading && !error && filteredBills.length === 0 && (
          <div className="text-center text-slate-600">No bills found.</div>
        )}

        {!loading && !error && filteredBills.length > 0 && (
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBills.map((b) => (
              <BillCard key={b._id} bill={b} />
            ))}

          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllBills;
