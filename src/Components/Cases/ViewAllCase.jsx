// src/pages/ViewAllCase.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

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
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const Label = ({ children }) => (
  <span className="text-[11px] uppercase tracking-wide text-gray-500 mr-2">{children}</span>
);

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // no-op
  }
};

const CaseCard = ({ caseData }) => {
  const {
    _id,
    p_id,
    patient_name,
    patient_phone,
    patient_phone_alt,
    gender,
    dob,
    joining_date,
    status,
    createdAt,
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

              {/* Case ID */}
              <div className="flex items-center gap-1">
                <Label>Case ID</Label>
                <code className="text-xs bg-gray-50 text-gray-700 px-2 py-0.5 rounded">{_id}</code>
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
        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div>
              <Label>Phone</Label>
              <span className="text-gray-800">{patient_phone || "N/A"}</span>
            </div>
            {patient_phone_alt && (
              <div className="mt-1">
                <Label>Alt Phone</Label>
                <span className="text-gray-800">{patient_phone_alt}</span>
              </div>
            )}
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

        {/* Meta */}
        <p className="text-gray-500 text-xs mt-3">🕒 Created: {formatDate(createdAt)}</p>

        {/* Actions */}
        <div className="pt-1 flex items-center gap-2">
          <button
            onClick={() => window.open(`/admin/case-details/${_id}`, "_blank")}
            className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            View Details
          </button>
          {/* Tip: your Details page can handle the single-bill flow using
              GET /cases/:caseId/bill and PUT /cases/:caseId/bill */}
        </div>
      </div>
    </div>
  );
};

const ViewAllCase = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const debounceRef = useRef(null);

  const fetchCases = async (q = "") => {
    try {
      setLoading(true);
      setError("");

      const url = `${import.meta.env.VITE_API_BASE_URL}/search-cases`;
      const { data } = await axios.get(url, {
        params: q ? { q } : undefined,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching cases:", err);
      setError("Failed to load cases. Please try again later.");
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load (server-side fetch, scoped by admin)
  useEffect(() => {
    fetchCases("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced server-side search
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-indigo-200 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-indigo-800">📋 All Patient Cases</h2>
            <p className="text-sm text-gray-500 mt-1">Showing {cases.length}</p>
          </div>
          <input
            type="text"
            placeholder="🔍 Search by name, phone, P.ID or Case ID..."
            className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Loading/Error States */}
        {loading && <div className="text-center text-gray-500">Loading cases...</div>}
        {error && <div className="text-center text-red-600">{error}</div>}
        {!loading && !error && cases.length === 0 && (
          <div className="text-center text-gray-600">No cases found.</div>
        )}

        {/* Cards */}
        {!loading && !error && cases.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((c) => (
              <CaseCard key={c._id} caseData={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllCase;
