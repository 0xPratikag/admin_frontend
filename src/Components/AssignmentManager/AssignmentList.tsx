import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TherapyAssignmentDetailsModal from "./TherapyAssignmentDetailsModal";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  UserGroupIcon,
  ClockIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

interface Assignment {
  assignmentId: string;
  caseId: string;
  therapyId: string;
  targetId: string;
  therapistId: string;
  kind: "subtherapy" | "test";
  date: string;
  from_time: string;
  to_time: string;
  case_p_id: string;
  case_patient_name: string;
  case_phone: string;
  case_type: string;
  therapy_name: string;
  target_name: string;
  therapist_name: string;
  isPrimary: boolean;
  isActive: boolean;
  assistants_count: number;
}

interface Meta {
  total: number;
  hasMore: boolean;
}

const AssignmentList: React.FC = () => {
  const navigate = useNavigate();

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` }),
    []
  );

  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "subtherapy" | "test">("all");
  const [therapistId, setTherapistId] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta>({ total: 0, hasMore: false });

  // Modal state
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedTherapyId, setSelectedTherapyId] = useState("");

  const fetchAssignments = async (pageToLoad = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/assignments", {
        headers: authHeaders,
        params: {
          q: q || undefined,
          type,
          therapistId: therapistId || undefined,
          upcoming: upcomingOnly ? "true" : "false",
          page: pageToLoad,
          limit: 25,
        },
      });
      setItems(res.data?.items || []);
      setMeta({
        total: res.data?.total || 0,
        hasMore: !!res.data?.hasMore,
      });
      setPage(pageToLoad);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.error || "Failed to load assignments list."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApplyFilters = () => {
    fetchAssignments(1);
  };

  const onClearFilters = () => {
    setQ("");
    setType("all");
    setTherapistId("");
    setUpcomingOnly(true);
    fetchAssignments(1);
  };

  const goToManager = (row: Assignment) => {
    navigate("/admin/assignments", {
      state: {
        source: "list",
        caseId: row.caseId,
        therapyId: row.therapyId,
        mode: row.kind === "test" ? "test" : "subtherapy",
        subTherapyId: row.kind === "subtherapy" ? row.targetId : "",
        testId: row.kind === "test" ? row.targetId : "",
      },
    });
  };

  const openStaffMap = (row: Assignment) => {
    setSelectedCaseId(row.caseId);
    setSelectedTherapyId(row.therapyId);
    setStaffModalOpen(true);
  };

  const closeStaffMap = () => {
    setStaffModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header with floating effect */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b border-indigo-100 shadow-lg shadow-indigo-100/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Assignments Hub
                  </h1>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Manage therapist assignments and staff mappings
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/assignments")}
              className="group relative px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                <span>Create Assignment</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Filters Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-indigo-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <FunnelIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Filter Assignments
                </h2>
                <p className="text-xs text-gray-600">
                  {meta.total} assignment{meta.total === 1 ? "" : "s"} found
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm"
                    placeholder="Patient ID, name, or phone..."
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Assignment Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="subtherapy">Sub-therapies</option>
                  <option value="test">Tests</option>
                </select>
              </div>

              {/* Therapist ID */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Therapist ID
                </label>
                <input
                  value={therapistId}
                  onChange={(e) => setTherapistId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm"
                  placeholder="Filter by ID..."
                />
              </div>
            </div>

            {/* Checkbox and Actions */}
            <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={upcomingOnly}
                    onChange={(e) => setUpcomingOnly(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-gray-300 text-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer"
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                  Show upcoming only
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClearFilters}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={onApplyFilters}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Apply Filters"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-indigo-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-100">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-indigo-600" />
                      Schedule
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Case
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Therapy
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Therapist
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-2">
                      <UserGroupIcon className="w-4 h-4 text-indigo-600" />
                      Assistants
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!loading && !items.length && (
                  <tr>
                    <td
                      className="px-6 py-12 text-center text-gray-500"
                      colSpan={8}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                          <UserGroupIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            No assignments found
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Try adjusting your filters or create a new
                            assignment
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {items.map((row) => (
                  <tr
                    key={`${row.kind}-${row.assignmentId}-${row.therapistId}-${row.date}-${row.from_time}`}
                    className="hover:bg-indigo-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">
                          {row.date || "-"}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {row.from_time || "--:--"} – {row.to_time || "--:--"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">
                          {row.case_p_id || "—"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {row.case_patient_name || "Unnamed"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {row.case_phone || ""}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">
                          {row.therapy_name || "Therapy"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {row.case_type || ""}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900">
                          {row.target_name || "(unnamed)"}
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            row.kind === "subtherapy"
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-sky-100 text-sky-700 border border-sky-200"
                          }`}
                        >
                          {row.kind === "subtherapy" ? "Sub-therapy" : "Test"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">
                          {row.therapist_name || "Therapist"}
                        </div>
                        <div className="text-xs text-gray-500 font-mono break-all">
                          {row.therapistId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            row.isPrimary
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {row.isPrimary ? "Primary" : "Secondary"}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            row.isActive
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                          }`}
                        >
                          {row.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200">
                        <span className="text-sm font-bold text-indigo-700">
                          {row.assistants_count ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => openStaffMap(row)}
                          className="w-full px-4 py-2 rounded-xl bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-all group-hover:shadow-md"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <MapPinIcon className="w-4 h-4" />
                            <span>Staff Map</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => goToManager(row)}
                          className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/30 transition-all"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.total > 25 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-100 px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-gray-700">
                  Page <span className="font-bold text-indigo-600">{page}</span>{" "}
                  · Showing{" "}
                  <span className="font-bold text-indigo-600">
                    {items.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-indigo-600">{meta.total}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => fetchAssignments(page - 1)}
                    className="px-4 py-2 rounded-xl bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!meta.hasMore || loading}
                    onClick={() => fetchAssignments(page + 1)}
                    className="px-4 py-2 rounded-xl bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <TherapyAssignmentDetailsModal
        open={staffModalOpen}
        onClose={closeStaffMap}
        caseId={selectedCaseId}
        therapyId={selectedTherapyId}
      />
    </div>
  );
};

export default AssignmentList;