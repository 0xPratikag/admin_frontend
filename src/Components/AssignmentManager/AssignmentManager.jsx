import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

const baseInputCls =
  "border rounded w-full p-2 text-sm focus:outline-none focus:ring-2 transition";
const normalBorder = "border-gray-300 focus:ring-indigo-500";
const errorBorder = "border-red-500 focus:ring-red-500";

const AssignmentManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillState = location.state || {};

  const {
    caseId: prefillCaseId,
    therapyId: prefillTherapyId,
    mode: prefillMode,
    subTherapyId: prefillSubTherapyId,
    testId: prefillTestId,
    source: prefillSource,
  } = prefillState;

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` }),
    []
  );

  const [cases, setCases] = useState([]);
  const [caseQuery, setCaseQuery] = useState("");
  const [loadingCases, setLoadingCases] = useState(false);

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [caseDetail, setCaseDetail] = useState(null);
  const [loadingCase, setLoadingCase] = useState(false);

  const [selectedTherapyId, setSelectedTherapyId] = useState("");
  const [mode, setMode] = useState("subtherapy"); // "subtherapy" | "test"
  const [selectedSubTherapyId, setSelectedSubTherapyId] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");

  const [assignment, setAssignment] = useState({ therapists: [] });
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  // availability dropdown state
  const [therapistOptionsByRow, setTherapistOptionsByRow] = useState({});
  const [loadingTherapistOptions, setLoadingTherapistOptions] = useState({});
  const [assistantOptionsByRow, setAssistantOptionsByRow] = useState({});
  const [loadingAssistantOptions, setLoadingAssistantOptions] = useState({});

  // prefill flags
  const [initializedFromState, setInitializedFromState] = useState(false);
  const [prefillSelectionDone, setPrefillSelectionDone] = useState(false);

  // ------- helpers -------
  const fieldCls = (hasError) =>
    `${baseInputCls} ${hasError ? errorBorder : normalBorder}`;

  const therapyPlan = useMemo(
    () => (caseDetail?.therapy_plan || []),
    [caseDetail]
  );

  const currentTherapyBlock = useMemo(
    () =>
      therapyPlan.find(
        (t) => String(t.therapyId) === String(selectedTherapyId)
      ) || null,
    [therapyPlan, selectedTherapyId]
  );

  const subTherapies = currentTherapyBlock?.subTherapy || [];
  const tests = currentTherapyBlock?.tests || [];

  const canEditAssignment =
    selectedCaseId &&
    selectedTherapyId &&
    ((mode === "subtherapy" && selectedSubTherapyId) ||
      (mode === "test" && selectedTestId));

  const currentTargetLabel = useMemo(() => {
    if (!currentTherapyBlock) return "";
    if (mode === "subtherapy") {
      const st = subTherapies.find(
        (s) => String(s.subTherapyId) === String(selectedSubTherapyId)
      );
      return st?.name || "";
    } else {
      const tt = tests.find((t) => String(t.testId) === String(selectedTestId));
      return tt?.name || "";
    }
  }, [
    currentTherapyBlock,
    mode,
    subTherapies,
    selectedSubTherapyId,
    tests,
    selectedTestId,
  ]);

  // ------- API calls -------

  const fetchCases = async () => {
    try {
      setLoadingCases(true);
      setError("");
      const res = await api.get("/search-cases", {
        headers: authHeaders,
        params: { q: caseQuery || "" },
      });
      setCases(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load cases.");
    } finally {
      setLoadingCases(false);
    }
  };

  const fetchCaseDetail = async (caseId) => {
    if (!caseId) return;
    try {
      setLoadingCase(true);
      setError("");
      const res = await api.get(`/view-case/${caseId}`, {
        headers: authHeaders,
      });
      setCaseDetail(res.data || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load case details.");
      setCaseDetail(null);
    } finally {
      setLoadingCase(false);
    }
  };

  const normalizeAssignmentFromServer = (doc) => {
    if (!doc) return { therapists: [] };
    const therapists = (doc.therapists || []).map((t) => ({
      therapistId: t.therapistId || "",
      therapist_name: t.therapist_name || "",
      date: t.date ? String(t.date).slice(0, 10) : "",
      from_time: t.from_time || "",
      to_time: t.to_time || "",
      isPrimary: !!t.isPrimary,
      isActive: t.isActive !== false,
      notes: t.notes || "",
      assistants: (t.assistants || []).map((a) => ({
        assistantId: a.assistantId || "",
        assistant_name: a.assistant_name || "",
        date: a.date ? String(a.date).slice(0, 10) : "",
        from_time: a.from_time || "",
        to_time: a.to_time || "",
        isActive: a.isActive !== false,
        notes: a.notes || "",
      })),
    }));
    return { therapists };
  };

  const buildAssignmentUrl = () => {
    if (!selectedCaseId || !selectedTherapyId) return null;
    if (mode === "subtherapy" && selectedSubTherapyId) {
      return `/cases/${selectedCaseId}/therapies/${selectedTherapyId}/subtherapies/${selectedSubTherapyId}/assignments`;
    }
    if (mode === "test" && selectedTestId) {
      return `/cases/${selectedCaseId}/therapies/${selectedTherapyId}/tests/${selectedTestId}/assignments`;
    }
    return null;
  };

  const fetchAssignment = async () => {
    const url = buildAssignmentUrl();
    if (!url) return;
    try {
      setLoadingAssignment(true);
      setError("");
      const res = await api.get(url, { headers: authHeaders });
      setAssignment(normalizeAssignmentFromServer(res.data));
      setTherapistOptionsByRow({});
      setAssistantOptionsByRow({});
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to load assignment.");
      setAssignment({ therapists: [] });
    } finally {
      setLoadingAssignment(false);
    }
  };

  const saveAssignment = async () => {
    const url = buildAssignmentUrl();
    if (!url) return;
    try {
      setSaving(true);
      setError("");

      // Clean + filter incomplete rows
      const cleanTherapists = (assignment.therapists || [])
        .filter((t) => t.therapistId && t.date && t.from_time && t.to_time)
        .map((t) => ({
          therapistId: t.therapistId,
          therapist_name: t.therapist_name?.trim() || undefined,
          date: t.date,
          from_time: t.from_time,
          to_time: t.to_time,
          isPrimary: !!t.isPrimary,
          isActive: t.isActive !== false,
          notes: t.notes || "",
          assistants: (t.assistants || [])
            .filter(
              (a) => a.assistantId && a.date && a.from_time && a.to_time
            )
            .map((a) => ({
              assistantId: a.assistantId,
              assistant_name: a.assistant_name?.trim() || undefined,
              date: a.date,
              from_time: a.from_time,
              to_time: a.to_time,
              isActive: a.isActive !== false,
              notes: a.notes || "",
            })),
        }));

      const payload = { therapists: cleanTherapists };
      const res = await api.put(url, payload, { headers: authHeaders });

      const doc = res.data?.data || res.data;
      setAssignment(normalizeAssignmentFromServer(doc));

      toast.success("Assignments saved successfully.");
      navigate("/admin/assignment_manager_List");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to save assignment.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ------- availability fetchers -------

  const fetchTherapistsForRow = async (tIndex) => {
    const row = assignment.therapists?.[tIndex];
    if (!row) return;
    if (!row.date || !row.from_time || !row.to_time) {
      setError(
        "Set date, from time and to time for the therapist row before checking availability."
      );
      return;
    }
    try {
      setError("");
      setLoadingTherapistOptions((prev) => ({ ...prev, [tIndex]: true }));
      const res = await api.get("/therapists", {
        headers: authHeaders,
        params: {
          date: row.date,
          from_time: row.from_time,
          to_time: row.to_time,
        },
      });
      const items = res.data?.items || res.data || [];
      setTherapistOptionsByRow((prev) => ({ ...prev, [tIndex]: items }));
    } catch (err) {
      console.error(err);
      setError("Failed to fetch therapist availability.");
    } finally {
      setLoadingTherapistOptions((prev) => ({ ...prev, [tIndex]: false }));
    }
  };

  const fetchAssistantsForRow = async (tIndex, aIndex) => {
    const therapist = assignment.therapists?.[tIndex];
    const a = therapist?.assistants?.[aIndex];
    if (!a) return;
    if (!a.date || !a.from_time || !a.to_time) {
      setError(
        "Set date, from time and to time for the assistant row before checking availability."
      );
      return;
    }
    const key = `${tIndex}-${aIndex}`;
    try {
      setError("");
      setLoadingAssistantOptions((prev) => ({ ...prev, [key]: true }));
      const res = await api.get("/assistants", {
        headers: authHeaders,
        params: {
          date: a.date,
          from_time: a.from_time,
          to_time: a.to_time,
        },
      });
      const items = res.data?.items || res.data || [];
      setAssistantOptionsByRow((prev) => ({ ...prev, [key]: items }));
    } catch (err) {
      console.error(err);
      setError("Failed to fetch assistant availability.");
    } finally {
      setLoadingAssistantOptions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const selectTherapistForRow = (tIndex, therapistId) => {
    const options = therapistOptionsByRow[tIndex] || [];
    const selected = options.find((th) => String(th._id) === String(therapistId));
    setAssignment((prev) => ({
      ...prev,
      therapists: prev.therapists.map((t, i) =>
        i === tIndex
          ? {
              ...t,
              therapistId,
              therapist_name: selected?.name || selected?.fullName || "",
            }
          : t
      ),
    }));
  };

  const selectAssistantForRow = (tIndex, aIndex, assistantId) => {
    const key = `${tIndex}-${aIndex}`;
    const options = assistantOptionsByRow[key] || [];
    const selected = options.find((as) => String(as._id) === String(assistantId));
    setAssignment((prev) => ({
      ...prev,
      therapists: prev.therapists.map((t, i) =>
        i === tIndex
          ? {
              ...t,
              assistants: (t.assistants || []).map((a, j) =>
                j === aIndex
                  ? {
                      ...a,
                      assistantId,
                      assistant_name:
                        selected?.name || selected?.fullName || "",
                    }
                  : a
              ),
            }
          : t
      ),
    }));
  };

  // ------- init load of cases -------
  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preselect case from state
  useEffect(() => {
    if (initializedFromState) return;
    if (!prefillCaseId) return;

    setInitializedFromState(true);
    setSelectedCaseId(prefillCaseId);
    setCaseDetail(null);
    setSelectedTherapyId("");
    setSelectedSubTherapyId("");
    setSelectedTestId("");
    setAssignment({ therapists: [] });
    setTherapistOptionsByRow({});
    setAssistantOptionsByRow({});
    fetchCaseDetail(prefillCaseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillCaseId, initializedFromState]);

  // After case detail is loaded, preselect therapy / target from state
  useEffect(() => {
    if (!caseDetail) return;
    if (!prefillCaseId || !prefillTherapyId) return;
    if (prefillSelectionDone) return;
    if (String(caseDetail._id) !== String(prefillCaseId)) return;

    // Use same logic as manual selection, then override mode/target based on state
    setSelectedTherapyId(prefillTherapyId);
    const blk = (caseDetail.therapy_plan || []).find(
      (t) => String(t.therapyId) === String(prefillTherapyId)
    );

    if (blk) {
      // default mode based on what exists, but then override with prefillMode
      if ((blk.subTherapy || []).length) {
        setMode("subtherapy");
      } else if ((blk.tests || []).length) {
        setMode("test");
      }
    }

    if (prefillMode === "test") {
      setMode("test");
      if (prefillTestId) {
        setSelectedTestId(prefillTestId);
      }
    } else {
      setMode("subtherapy");
      if (prefillSubTherapyId) {
        setSelectedSubTherapyId(prefillSubTherapyId);
      }
    }

    setPrefillSelectionDone(true);
  }, [
    caseDetail,
    prefillCaseId,
    prefillTherapyId,
    prefillMode,
    prefillSubTherapyId,
    prefillTestId,
    prefillSelectionDone,
  ]);

  // ------- handlers for UI -------

  const onSelectCase = (caseId) => {
    setSelectedCaseId(caseId);
    setCaseDetail(null);
    setSelectedTherapyId("");
    setSelectedSubTherapyId("");
    setSelectedTestId("");
    setAssignment({ therapists: [] });
    setTherapistOptionsByRow({});
    setAssistantOptionsByRow({});
    if (caseId) {
      fetchCaseDetail(caseId);
    }
  };

  const onSelectTherapy = (therapyId) => {
    setSelectedTherapyId(therapyId);
    setSelectedSubTherapyId("");
    setSelectedTestId("");
    setAssignment({ therapists: [] });
    setTherapistOptionsByRow({});
    setAssistantOptionsByRow({});

    const blk = therapyPlan.find(
      (t) => String(t.therapyId) === String(therapyId)
    );
    if (!blk) return;

    // default mode based on what exists
    if ((blk.subTherapy || []).length) {
      setMode("subtherapy");
    } else if ((blk.tests || []).length) {
      setMode("test");
    }
  };

  const addTherapistRow = () => {
    setAssignment((prev) => ({
      ...prev,
      therapists: [
        ...prev.therapists,
        {
          therapistId: "",
          therapist_name: "",
          date: "",
          from_time: "",
          to_time: "",
          isPrimary: prev.therapists.length === 0,
          isActive: true,
          notes: "",
          assistants: [],
        },
      ],
    }));
  };

  const removeTherapistRow = (idx) => {
    setAssignment((prev) => ({
      ...prev,
      therapists: prev.therapists.filter((_, i) => i !== idx),
    }));
    setTherapistOptionsByRow((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
    setAssistantOptionsByRow((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((key) => {
        if (key.startsWith(`${idx}-`)) delete copy[key];
      });
      return copy;
    });
  };

  const updateTherapistField = (idx, key, value) => {
    setAssignment((prev) => ({
      ...prev,
      therapists: prev.therapists.map((t, i) =>
        i === idx ? { ...t, [key]: value } : t
      ),
    }));
    if (["date", "from_time", "to_time"].includes(key)) {
      setTherapistOptionsByRow((prev) => {
        const copy = { ...prev };
        delete copy[idx];
        return copy;
      });
    }
  };

  const setPrimaryTherapist = (idx) => {
    setAssignment((prev) => ({
      ...prev,
      therapists: prev.therapists.map((t, i) => ({
        ...t,
        isPrimary: i === idx,
      })),
    }));
  };

  const addAssistantRow = (tIndex) => {
    setAssignment((prev) => ({
      ...prev,
      therapists: prev.therapists.map((t, i) =>
        i === tIndex
          ? {
              ...t,
              assistants: [
                ...(t.assistants || []),
                {
                  assistantId: "",
                  assistant_name: "",
                  date: t.date || "",
                  from_time: t.from_time || "",
                  to_time: t.to_time || "",
                  isActive: true,
                  notes: "",
                },
              ],
            }
          : t
      ),
    }));
  };

  const removeAssistantRow = (tIndex, aIndex) => {
    setAssignment((prev) => ({
      ...prev,
      therapists: prev.therapists.map((t, i) =>
        i === tIndex
          ? {
              ...t,
              assistants: t.assistants.filter((_, j) => j !== aIndex),
            }
          : t
      ),
    }));
    const key = `${tIndex}-${aIndex}`;
    setAssistantOptionsByRow((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const updateAssistantField = (tIndex, aIndex, key, value) => {
    setAssignment((prev) => ({
      ...prev,
      therapists: prev.therapists.map((t, i) =>
        i === tIndex
          ? {
              ...t,
              assistants: t.assistants.map((a, j) =>
                j === aIndex ? { ...a, [key]: value } : a
              ),
            }
          : t
      ),
    }));
    if (["date", "from_time", "to_time"].includes(key)) {
      const rowKey = `${tIndex}-${aIndex}`;
      setAssistantOptionsByRow((prev) => {
        const copy = { ...prev };
        delete copy[rowKey];
        return copy;
      });
    }
  };

  // ------- render -------

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-white py-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700">
              🧩 Assignment Manager
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Select case → therapy → sub-therapy / test, then assign therapist
              and assistants with date &amp; time. Therapist/assistant dropdowns
              show available staff for that slot.
            </p>
            {prefillSource === "list" && (
              <p className="text-[11px] text-gray-500 mt-1">
                Opened from assignments list; case/therapy/target are
                preselected.
              </p>
            )}
          </div>
          <button
            className="text-xs text-gray-500 underline"
            onClick={() =>
              prefillSource === "list"
                ? navigate("/admin/assignment_manager_List")
                : navigate("/admin/view-cases")
            }
          >
            ← Back
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 p-2 text-sm rounded">
            {error}
          </div>
        )}

        {/* STEP 1: Select Case */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">
            1️⃣ Select Case
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              type="text"
              placeholder="Search by P.ID / name / phone"
              value={caseQuery}
              onChange={(e) => setCaseQuery(e.target.value)}
              className={`${baseInputCls} ${normalBorder} min-w-[220px]`}
            />
            <button
              type="button"
              onClick={fetchCases}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
              disabled={loadingCases}
            >
              {loadingCases ? "Searching…" : "Search"}
            </button>
          </div>
          <div className="mt-2">
            <label className="text-xs text-gray-600 mb-1 block">
              Select Case
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => onSelectCase(e.target.value)}
              className={`${baseInputCls} ${normalBorder}`}
            >
              <option value="">-- Choose case --</option>
              {cases.map((c) => (
                <option key={c._id} value={c._id}>
                  {(c.p_id ? `${c.p_id} — ` : "") +
                    (c.patient_name || "Unnamed")}
                </option>
              ))}
            </select>
            {loadingCase && (
              <p className="text-xs text-gray-500 mt-1">Loading case…</p>
            )}
          </div>
        </section>

        {/* STEP 2: Select Therapy */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">
            2️⃣ Select Therapy (from case plan)
          </h2>
          {!caseDetail && (
            <p className="text-sm text-gray-500">
              Select a case first to see its therapy plan.
            </p>
          )}
          {caseDetail && !therapyPlan.length && (
            <p className="text-sm text-gray-500">
              This case does not have any therapy plan snapshot yet.
            </p>
          )}
          {caseDetail && therapyPlan.length > 0 && (
            <select
              value={selectedTherapyId}
              onChange={(e) => onSelectTherapy(e.target.value)}
              className={`${baseInputCls} ${normalBorder} max-w-md`}
            >
              <option value="">-- Choose therapy --</option>
              {therapyPlan.map((t) => (
                <option key={t.therapyId} value={t.therapyId}>
                  {t.therapy_name || "Therapy"}{" "}
                  {t.tests?.length ? ` (Tests: ${t.tests.length})` : ""}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* STEP 3: Choose Sub-therapy / Test */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">
            3️⃣ Select Sub-therapy or Test
          </h2>

          {!currentTherapyBlock && (
            <p className="text-sm text-gray-500">
              Select a therapy to see its sub-therapies / tests.
            </p>
          )}

          {currentTherapyBlock && (
            <>
              {/* Mode toggle */}
              <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("subtherapy")}
                  disabled={!subTherapies.length}
                  className={`px-3 py-1 rounded-full ${
                    mode === "subtherapy"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700"
                  } ${
                    !subTherapies.length
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  Sub-therapies
                </button>
                <button
                  type="button"
                  onClick={() => setMode("test")}
                  disabled={!tests.length}
                  className={`px-3 py-1 rounded-full ${
                    mode === "test"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700"
                  } ${
                    !tests.length
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  Tests
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sub-therapy select */}
                {mode === "subtherapy" && (
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">
                      Sub-therapy
                    </label>
                    <select
                      value={selectedSubTherapyId}
                      onChange={(e) => {
                        setSelectedSubTherapyId(e.target.value);
                        setAssignment({ therapists: [] });
                        setTherapistOptionsByRow({});
                        setAssistantOptionsByRow({});
                      }}
                      className={`${baseInputCls} ${normalBorder}`}
                    >
                      <option value="">-- Choose sub-therapy --</option>
                      {subTherapies.map((s) => (
                        <option key={s.subTherapyId} value={s.subTherapyId}>
                          {s.name || "Sub-therapy"}
                        </option>
                      ))}
                    </select>
                    {!subTherapies.length && (
                      <p className="text-xs text-gray-500 mt-1">
                        No sub-therapies in this case plan.
                      </p>
                    )}
                  </div>
                )}

                {/* Test select */}
                {mode === "test" && (
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">
                      Test
                    </label>
                    <select
                      value={selectedTestId}
                      onChange={(e) => {
                        setSelectedTestId(e.target.value);
                        setAssignment({ therapists: [] });
                        setTherapistOptionsByRow({});
                        setAssistantOptionsByRow({});
                      }}
                      className={`${baseInputCls} ${normalBorder}`}
                    >
                      <option value="">-- Choose test --</option>
                      {tests.map((t) => (
                        <option key={t.testId} value={t.testId}>
                          {t.name || "Test"}
                        </option>
                      ))}
                    </select>
                    {!tests.length && (
                      <p className="text-xs text-gray-500 mt-1">
                        No tests configured in this case plan.
                      </p>
                    )}
                  </div>
                )}

                {/* Load button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={fetchAssignment}
                    disabled={!canEditAssignment || loadingAssignment}
                    className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingAssignment ? "Loading…" : "Load Assignment"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* STEP 4: Assignment Editor */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">
            4️⃣ Assign Therapist &amp; Assistants
          </h2>

          {!canEditAssignment && (
            <p className="text-sm text-gray-500">
              Select case, therapy and sub-therapy / test first.
            </p>
          )}

          {canEditAssignment && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-gray-600">
                  Editing assignment for:{" "}
                  <span className="font-semibold text-indigo-700">
                    {currentTargetLabel || "(unnamed)"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addTherapistRow}
                    className="px-3 py-1.5 rounded border border-indigo-300 text-indigo-700 text-xs hover:bg-indigo-50"
                  >
                    + Add therapist
                  </button>
                  <button
                    type="button"
                    onClick={fetchAssignment}
                    className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                  >
                    Reset from server
                  </button>
                </div>
              </div>

              {/* Therapists list */}
              <div className="space-y-4 mt-2">
                {!(assignment.therapists || []).length && (
                  <p className="text-sm text-gray-500">
                    No therapists added yet. Click{" "}
                    <span className="font-medium">“+ Add therapist”</span> to
                    start.
                  </p>
                )}

                {assignment.therapists.map((t, tIndex) => {
                  const therapistOptions = therapistOptionsByRow[tIndex] || [];
                  const therapistLoading = !!loadingTherapistOptions[tIndex];

                  return (
                    <div
                      key={tIndex}
                      className="border border-gray-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Therapist #{tIndex + 1}
                          </span>
                          <label className="inline-flex items-center gap-1 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={!!t.isPrimary}
                              onChange={() => setPrimaryTherapist(tIndex)}
                            />
                            <span>Primary</span>
                          </label>
                          <label className="inline-flex items-center gap-1 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={t.isActive !== false}
                              onChange={(e) =>
                                updateTherapistField(
                                  tIndex,
                                  "isActive",
                                  e.target.checked
                                )
                              }
                            />
                            <span>Active</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTherapistRow(tIndex)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Remove therapist
                        </button>
                      </div>

                      {/* Therapist fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">
                              Therapist (available for slot)
                            </span>
                            <button
                              type="button"
                              onClick={() => fetchTherapistsForRow(tIndex)}
                              className="text-[10px] text-indigo-600 hover:underline"
                            >
                              {therapistLoading
                                ? "Checking…"
                                : "Check availability"}
                            </button>
                          </div>
                          <select
                            value={t.therapistId || ""}
                            onChange={(e) =>
                              selectTherapistForRow(tIndex, e.target.value)
                            }
                            className={fieldCls(false)}
                          >
                            <option value="">
                              -- Choose therapist for this slot --
                            </option>
                            {therapistOptions.map((th) => (
                              <option key={th._id} value={th._id}>
                                {th.name || th.fullName || "Therapist"}{" "}
                                {th.phone ? `(${th.phone})` : ""}
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {therapistOptions.length
                              ? `Available therapists: ${therapistOptions.length}`
                              : 'No therapists loaded yet. Set date & time, then click “Check availability”. You can still save with selected ID if already set.'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">
                            Therapist name (snapshot)
                          </label>
                          <input
                            type="text"
                            value={t.therapist_name}
                            onChange={(e) =>
                              updateTherapistField(
                                tIndex,
                                "therapist_name",
                                e.target.value
                              )
                            }
                            className={fieldCls(false)}
                            placeholder="Name for display"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">
                            Date
                          </label>
                          <input
                            type="date"
                            value={t.date || ""}
                            onChange={(e) =>
                              updateTherapistField(
                                tIndex,
                                "date",
                                e.target.value
                              )
                            }
                            className={fieldCls(false)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">
                            From time
                          </label>
                          <input
                            type="time"
                            value={t.from_time || ""}
                            onChange={(e) =>
                              updateTherapistField(
                                tIndex,
                                "from_time",
                                e.target.value
                              )
                            }
                            className={fieldCls(false)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">
                            To time
                          </label>
                          <input
                            type="time"
                            value={t.to_time || ""}
                            onChange={(e) =>
                              updateTherapistField(
                                tIndex,
                                "to_time",
                                e.target.value
                              )
                            }
                            className={fieldCls(false)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">
                            Notes (optional)
                          </label>
                          <input
                            type="text"
                            value={t.notes || ""}
                            onChange={(e) =>
                              updateTherapistField(
                                tIndex,
                                "notes",
                                e.target.value
                              )
                            }
                            className={fieldCls(false)}
                            placeholder="Any remark"
                          />
                        </div>
                      </div>

                      {/* Assistants */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-gray-700">
                            Assistants ({t.assistants?.length || 0})
                          </h4>
                          <button
                            type="button"
                            onClick={() => addAssistantRow(tIndex)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            + Add assistant
                          </button>
                        </div>

                        {!t.assistants?.length && (
                          <p className="text-xs text-gray-400">
                            No assistants added for this therapist.
                          </p>
                        )}

                        {(t.assistants || []).map((a, aIndex) => {
                          const key = `${tIndex}-${aIndex}`;
                          const assistantOptions =
                            assistantOptionsByRow[key] || [];
                          const assistantLoading =
                            !!loadingAssistantOptions[key];

                          return (
                            <div
                              key={aIndex}
                              className="border border-dashed border-gray-200 rounded-md p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">
                                  Assistant #{aIndex + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeAssistantRow(tIndex, aIndex)
                                  }
                                  className="text-rose-600 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-600">
                                      Assistant (available for slot)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        fetchAssistantsForRow(tIndex, aIndex)
                                      }
                                      className="text-[10px] text-indigo-600 hover:underline"
                                    >
                                      {assistantLoading
                                        ? "Checking…"
                                        : "Check availability"}
                                    </button>
                                  </div>
                                  <select
                                    value={a.assistantId || ""}
                                    onChange={(e) =>
                                      selectAssistantForRow(
                                        tIndex,
                                        aIndex,
                                        e.target.value
                                      )
                                    }
                                    className={fieldCls(false)}
                                  >
                                    <option value="">
                                      -- Choose assistant for this slot --
                                    </option>
                                    {assistantOptions.map((as) => (
                                      <option key={as._id} value={as._id}>
                                        {as.name ||
                                          as.fullName ||
                                          "Assistant"}{" "}
                                        {as.phone ? `(${as.phone})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-[11px] text-gray-400 mt-1">
                                    {assistantOptions.length
                                      ? `Available assistants: ${assistantOptions.length}`
                                      : 'No assistants loaded yet. Set date & time, then click “Check availability”.'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 mb-1 block">
                                    Assistant name
                                  </label>
                                  <input
                                    type="text"
                                    value={a.assistant_name}
                                    onChange={(e) =>
                                      updateAssistantField(
                                        tIndex,
                                        aIndex,
                                        "assistant_name",
                                        e.target.value
                                      )
                                    }
                                    className={fieldCls(false)}
                                    placeholder="Name"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 mb-1 block">
                                    Date
                                  </label>
                                  <input
                                    type="date"
                                    value={a.date || ""}
                                    onChange={(e) =>
                                      updateAssistantField(
                                        tIndex,
                                        aIndex,
                                        "date",
                                        e.target.value
                                      )
                                    }
                                    className={fieldCls(false)}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 mb-1 block">
                                    From time
                                  </label>
                                  <input
                                    type="time"
                                    value={a.from_time || ""}
                                    onChange={(e) =>
                                      updateAssistantField(
                                        tIndex,
                                        aIndex,
                                        "from_time",
                                        e.target.value
                                      )
                                    }
                                    className={fieldCls(false)}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 mb-1 block">
                                    To time
                                  </label>
                                  <input
                                    type="time"
                                    value={a.to_time || ""}
                                    onChange={(e) =>
                                      updateAssistantField(
                                        tIndex,
                                        aIndex,
                                        "to_time",
                                        e.target.value
                                      )
                                    }
                                    className={fieldCls(false)}
                                  />
                                </div>
                                <div className="flex items-center gap-2 mt-5">
                                  <input
                                    type="checkbox"
                                    checked={a.isActive !== false}
                                    onChange={(e) =>
                                      updateAssistantField(
                                        tIndex,
                                        aIndex,
                                        "isActive",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <span className="text-xs text-gray-700">
                                    Active
                                  </span>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">
                                  Notes
                                </label>
                                <input
                                  type="text"
                                  value={a.notes || ""}
                                  onChange={(e) =>
                                    updateAssistantField(
                                      tIndex,
                                      aIndex,
                                      "notes",
                                      e.target.value
                                    )
                                  }
                                  className={fieldCls(false)}
                                  placeholder="Any remark"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Save button */}
              <div className="pt-4 text-right">
                <button
                  type="button"
                  onClick={saveAssignment}
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "💾 Save Assignment"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AssignmentManager;
