// src/pages/ViewAllCase.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

const statusColor = {
  open: "bg-blue-100 text-blue-800",
  "in-progress": "bg-amber-100 text-amber-800",
  closed: "bg-green-100 text-green-800",
};

const formatDate = (iso) => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "N/A"
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
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const Label = ({ children }) => (
  <span className="text-[11px] uppercase tracking-wide text-gray-500 mr-2">
    {children}
  </span>
);

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(String(text || ""));
    toast.success("Copied");
  } catch {
    // no-op
  }
};

const CaseCard = ({ caseData, onDeleteCase, deleting }) => {
  const {
    _id,
    case_uid,
    p_id,
    patient_name,
    patient_phone,
    patient_phone_alt,
    gender,
    dob,
    joining_date,
    status,
    createdAt,
    total_cost,
  } = caseData || {};

  const handleClick = () => window.open(`/admin/case-details/${_id}`, "_blank");

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              onClick={handleClick}
              className="text-lg font-bold text-indigo-700 hover:underline cursor-pointer"
              title="Open case details"
            >
              {patient_name || "Unnamed"}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {/* Case UID */}
              <div className="flex items-center gap-1">
                <Label>Case UID</Label>
                <code className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                  {case_uid || "N/A"}
                </code>
                {case_uid && (
                  <button
                    onClick={() => copyText(case_uid)}
                    type="button"
                    className="text-[11px] text-indigo-600 hover:underline"
                    title="Copy Case UID"
                  >
                    Copy
                  </button>
                )}
              </div>

              {/* P.ID */}
              <div className="flex items-center gap-1">
                <Label>P.ID</Label>
                <code className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  {p_id || "N/A"}
                </code>
                {p_id && (
                  <button
                    onClick={() => copyText(p_id)}
                    type="button"
                    className="text-[11px] text-indigo-600 hover:underline"
                    title="Copy P.ID"
                  >
                    Copy
                  </button>
                )}
              </div>

              {/* Mongo ID */}
              <div className="flex items-center gap-1">
                <Label>ID</Label>
                <code className="text-xs bg-gray-50 text-gray-700 px-2 py-0.5 rounded">
                  {_id}
                </code>
                {_id && (
                  <button
                    onClick={() => copyText(_id)}
                    type="button"
                    className="text-[11px] text-indigo-600 hover:underline"
                    title="Copy Case ID"
                  >
                    Copy
                  </button>
                )}
              </div>
            </div>
          </div>

          <span
            className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${
              statusColor[status] || "bg-gray-100 text-gray-700"
            }`}
            title="Status"
          >
            {status || "open"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div>
              <Label>Phone</Label>
              <span className="text-gray-800">{patient_phone || "N/A"}</span>
            </div>
            {patient_phone_alt ? (
              <div className="mt-1">
                <Label>Alt Phone</Label>
                <span className="text-gray-800">{patient_phone_alt}</span>
              </div>
            ) : null}
            <div className="mt-1">
              <Label>Gender</Label>
              <span className="text-gray-800">{gender || "N/A"}</span>
            </div>
          </div>

          <div>
            <div>
              <Label>D.O.B</Label>
              <span className="text-gray-800">{formatDate(dob)}</span>
            </div>
            <div className="mt-1">
              <Label>Joining Date</Label>
              <span className="text-gray-800">{formatDate(joining_date)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-gray-500 text-xs">🕒 Created: {formatDate(createdAt)}</p>
          <p className="text-xs font-semibold text-gray-700">
            Total: <span className="text-indigo-700">{inr(total_cost)}</span>
          </p>
        </div>

        <div className="pt-1 flex items-center gap-2">
          <button
            onClick={() => window.open(`/admin/case-details/${_id}`, "_blank")}
            className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            View Details
          </button>

          {/* ✅ DELETE / CLOSE */}
          <button
            type="button"
            disabled={deleting}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCase?.(_id);
            }}
            className={`text-xs px-3 py-1.5 rounded-md border ${
              deleting
                ? "border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed"
                : "border-rose-300 text-rose-700 hover:bg-rose-50"
            }`}
            title="Will close/delete only if billing is not generated"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>

        <p className="text-[11px] text-gray-500">
          Note: Billing generated ho chuki ho to delete/close allowed nahi hoga.
        </p>
      </div>
    </div>
  );
};

const ViewAllCase = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { status, uiMessage, apiMessage } or null
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const debounceRef = useRef(null);

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchCases = async (q = "") => {
    try {
      setLoading(true);
      setError(null);

      const url = `${import.meta.env.VITE_API_BASE_URL}/search-cases`;
      const { data } = await axios.get(url, {
        params: q ? { q } : undefined,
        headers: authHeader(),
      });

      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching cases:", err);

      const status = err.response?.status;
      const apiMessage = err.response?.data?.error || err.response?.data?.message || null;

      let uiMessage = "Something went wrong while loading cases.";
      if (status === 403) {
        uiMessage = "You don’t have permission to view cases yet. Please contact your administrator.";
      } else if (status === 401) {
        uiMessage = "Your session has expired. Please log in again to continue.";
      } else if (!status) {
        uiMessage = "Unable to reach the server. Please check your internet connection.";
      }

      setError({ status, uiMessage, apiMessage });

      toast.error(apiMessage && apiMessage !== uiMessage ? apiMessage : uiMessage, {
        id: "cases-error",
      });

      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ delete/close handler
const handleDeleteCase = async (id, force = false) => {
  if (!id) return;

  const msg = force
    ? "Are you sure you want to PERMANENTLY delete this case?\n\nNote: If billing is already generated, deletion will be blocked."
    : "Are you sure you want to close this case?\n\nNote: If billing is already generated, closing/deleting will be blocked.";

  const ok = window.confirm(msg);
  if (!ok) return;

  try {
    setDeletingId(id);

    const url = `${import.meta.env.VITE_API_BASE_URL}/cases/${id}${force ? "?force=true" : ""}`;
    const res = await axios.delete(url, { headers: authHeader() });

    toast.success(res.data?.message || (force ? "✅ Case deleted." : "✅ Case closed."));

    // If backend sent updated doc => soft close
    if (res.data?.data?._id) {
      const updated = res.data.data;
      setCases((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
    } else {
      // hard delete => remove from list
      setCases((prev) => prev.filter((c) => c._id !== id));
    }
  } catch (err) {
    const status = err.response?.status;
    const apiMsg = err.response?.data?.error || err.response?.data?.message;

    if (status === 409) {
      toast.error(apiMsg || "❌ Billing already generated. Action not allowed.");
    } else if (status === 403) {
      toast.error("❌ You don’t have permission to delete/close cases.");
    } else if (status === 401) {
      toast.error("❌ Session expired. Please login again.");
    } else {
      toast.error(apiMsg || "❌ Failed to delete/close case.");
    }
  } finally {
    setDeletingId(null);
  }
};


  useEffect(() => {
    fetchCases("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCases(searchTerm.trim());
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <div className="p-6 w-full bg-gray-50 min-h-screen">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto">
        <div className="border-b border-indigo-200 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-indigo-800">📋 All Patient Cases</h2>
            <p className="text-sm text-gray-500 mt-1">Showing {cases.length}</p>
          </div>

          <input
            type="text"
            placeholder="🔍 Search by name, phone, P.ID, Case UID or ID..."
            className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && (
          <div className="mb-6">
            <div className="max-w-2xl mx-auto bg-white border-l-4 border-red-500 shadow-md rounded-lg p-4 flex gap-3">
              <div className="text-2xl">🚫</div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-700">{error.uiMessage}</p>

                {error.apiMessage && (
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Server says:</span> {error.apiMessage}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  {error.status && (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-medium text-red-700 uppercase tracking-wide">
                      HTTP {error.status}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => fetchCases(searchTerm.trim())}
                    className="ml-auto text-[11px] px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-500 py-10">
            <div className="inline-flex flex-col items-center gap-2">
              <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading cases...</p>
            </div>
          </div>
        )}

        {!loading && !error && cases.length === 0 && (
          <div className="text-center text-gray-600 py-10">
            <p className="text-lg font-medium">No cases found.</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or check back later.</p>
          </div>
        )}

        {!loading && !error && cases.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((c) => (
              <CaseCard
                key={c._id}
                caseData={c}
                onDeleteCase={handleDeleteCase}
                deleting={deletingId === c._id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllCase;
