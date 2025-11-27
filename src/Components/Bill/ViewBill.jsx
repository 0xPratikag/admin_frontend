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
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));

const Chip = ({ className = "", children }) => (
  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${className}`}>{children}</span>
);

const Progress = ({ value }) => (
  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
    <div
      className="h-2 bg-emerald-500"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const BillCard = ({ bill }) => {
  const navigate = useNavigate();
  const {
    _id,
    summary,
    total_amount,
    paid_amount = 0, // new field from backend; if absent, treated as 0
    payment_status,
    bill_date,
    due_date,
    createdAt,
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
          <h3 className="text-base font-semibold text-slate-800 truncate pr-2" title={patientName}>
            {patientName}
          </h3>
          <Chip className={`${statusColor[payment_status] || "bg-slate-100 text-slate-700"} capitalize`}>
            {payment_status || "pending"}
          </Chip>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
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

const ViewAllBills = () => {
  const location = useLocation();
  const pinnedPId = location?.state?.p_id || "";
  const pinnedCaseId = location?.state?.case_id || "";

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBills = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/view-bills`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // sort newest first (createdAt desc)
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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

  // Compose filters: pinned (from state) + free-text search
  const filteredBills = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();

    return (bills || []).filter((b) => {
      const billId = String(b?._id || "").toLowerCase();
      const caseId = String(b?.caseId?._id || "").toLowerCase();
      const pid = String(b?.caseId?.p_id || "").toLowerCase();
      const name = String(b?.caseId?.patient_name || "").toLowerCase();
      const phone = String(b?.caseId?.patient_phone || "").toLowerCase();
      const status = String(b?.payment_status || "").toLowerCase();

      // Pinned filter (if provided)
      if (pinnedPId && pid !== pinnedPId.toLowerCase()) return false;
      if (pinnedCaseId && caseId !== pinnedCaseId.toLowerCase()) return false;

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
  }, [bills, searchTerm, pinnedPId, pinnedCaseId]);

  const hasPin = Boolean(pinnedPId || pinnedCaseId);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          className="border-b border-sky-200 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-sky-700">🧾 All Bills</h2>
            <p className="text-slate-500 text-sm">
              Showing {filteredBills.length} of {bills.length}
            </p>
            {hasPin && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {pinnedPId ? (
                  <Chip className="bg-indigo-50 text-indigo-700">
                    Filtered by P.ID: <span className="font-semibold ml-1">{pinnedPId}</span>
                  </Chip>
                ) : null}
                {pinnedCaseId ? (
                  <Chip className="bg-slate-100 text-slate-800">
                    Filtered by Case ID: <span className="font-semibold ml-1">{pinnedCaseId}</span>
                  </Chip>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="🔍 Search name/phone/P.ID/case ID/bill ID..."
              className="w-full sm:w-96 px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </motion.div>

        {loading && <div className="text-center text-slate-500">Loading bills...</div>}
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
