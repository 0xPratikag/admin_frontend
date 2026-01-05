import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

// ✅ 3rd party tooltip (fixes hover css + overflow clipping)
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

// (suggestions only)
const caseTypeOptions = ["Ortho", "Neuro", "General", "Cardio", "Pediatrics", "ENT", "Dental"];
const conditionOptions = ["Diabetes", "Hypertension", "Asthma", "Arthritis"];

// ---------- small helpers ----------
const idFromKey = (key) => key.replace(/\./g, "_");
const baseInputCls = "border rounded w-full p-2 focus:outline-none transition";
const normalBorder = "border-gray-300 focus:ring-2 focus:ring-indigo-500";
const errorBorder = "border-red-500 focus:ring-2 focus:ring-red-500";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

// -------- DOB/Age helpers --------
const pad2 = (n) => String(n).padStart(2, "0");
const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function isValidDateString(s) {
  if (!s) return false;
  const d = new Date(s);
  return d.toString() !== "Invalid Date";
}

// Age (years) from dob
function calcAgeFromDob(dobStr) {
  if (!isValidDateString(dobStr)) return "";
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  if (age < 0) return "";
  return String(age);
}

// DOB from age (approx): sets year = todayYear - age, month/day = today
function calcDobFromAge(ageVal) {
  const a = Number(ageVal);
  if (!Number.isFinite(a) || a < 0) return "";
  const today = new Date();
  const y = today.getFullYear() - Math.floor(a);
  const m = today.getMonth();
  const d = today.getDate();
  const dob = new Date(y, m, d);
  return toISODate(dob);
}

export default function CreateCase() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const isUpdate = Boolean(caseId);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` }),
    []
  );

  // track last field user edited (to prevent DOB<->Age loop)
  const lastEditedRef = useRef(null); // "dob" | "age" | null

  const [formData, setFormData] = useState({
    p_id: "",
    patient_name: "",
    patient_phone: "",
    patient_phone_alt: "",
    gender: "",
    dob: "",
    age: "",
    joining_date: "", // set default below
    grant_app_access: false,
    address: {
      line1: "",
      line2: "",
      country: "",
      state: "",
      city: "",
      pincode: "",
    },
    case_type: "",
    description: "",
    therapies: [],
    conditions: [],
    other_details: {
      father: { name: "", occupation: "" },
      mother: { name: "", occupation: "" },
      husband: { name: "", occupation: "" },
      spouse: { name: "", occupation: "" },
      additional_info: "",
    },
  });

  /**
   * Therapy plan payload format (frontend) — includes quantities:
   * therapyPlan: [
   *  {
   *    therapyId,
   *    subTherapy: [
   *      {
   *        subTherapyId,
   *        pricePerSession: boolean,   // for current backend compatibility
   *        pricePerPackage: boolean,   // for current backend compatibility
   *        sessions_count?: number,    // NEW
   *        packages_count?: number,    // NEW
   *      }
   *    ],
   *    therapyTestsEnabled,
   *    tests: [{ testId }]
   *  }
   * ]
   */
  const [therapyPlan, setTherapyPlan] = useState([]);
  const [therapyList, setTherapyList] = useState([]);
  const [therapyLoading, setTherapyLoading] = useState(false);
  const [catalogs, setCatalogs] = useState({});
  const [catalogLoading, setCatalogLoading] = useState({});
  const [testSearch, setTestSearch] = useState({});

  // Conditions chip input
  const [conditionInput, setConditionInput] = useState("");

  // Client ID verify UI state
  const [pidStatus, setPidStatus] = useState({ state: "idle", msg: "" });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!!caseId);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ---------- set default joining date (create mode) ----------
  useEffect(() => {
    if (!isUpdate) {
      const todayStr = toISODate(new Date());
      setFormData((p) => ({
        ...p,
        joining_date: p.joining_date || todayStr, // default today only if empty
      }));
    }
  }, [isUpdate]);

  // ---------- fetch therapy catalog (active only) ----------
  const fetchTherapies = async () => {
    try {
      setTherapyLoading(true);
      const res = await api.get(`/therapies`, {
        headers: authHeaders,
        params: { isActive: true, limit: 500 },
      });
      setTherapyList(res.data?.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTherapyLoading(false);
    }
  };

  const loadCatalogForTherapy = useCallback(
    async (therapyId) => {
      if (!therapyId) return;
      const key = String(therapyId);
      if (catalogs[key]?.subtherapies && catalogs[key]?.tests) return;

      try {
        setCatalogLoading((p) => ({ ...p, [key]: true }));
        const [subs, tests] = await Promise.all([
          api.get(`/therapies/${therapyId}/subtherapies`, {
            headers: authHeaders,
            params: { isActive: true, limit: 1000 },
          }),
          api.get(`/therapies/${therapyId}/tests`, {
            headers: authHeaders,
            params: { isActive: true, limit: 1000 },
          }),
        ]);

        setCatalogs((p) => ({
          ...p,
          [key]: {
            subtherapies: subs?.data?.items || [],
            tests: tests?.data?.items || [],
          },
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setCatalogLoading((p) => ({ ...p, [key]: false }));
      }
    },
    [authHeaders, catalogs]
  );

  // ---------- init ----------
  useEffect(() => {
    fetchTherapies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await api.get(`/view-case/${caseId}`, { headers: authHeaders });
        const c = res.data || {};

        const planFromSnapshot = Array.isArray(c.therapy_plan)
          ? c.therapy_plan.map((t) => ({
              therapyId: String(t.therapyId),
              subTherapy: Array.isArray(t.subTherapy)
                ? t.subTherapy.map((s) => {
                    const pricePerSession = !!s?.flags?.pricePerSession;
                    const pricePerPackage = !!s?.flags?.pricePerPackage;

                    const sessions_count =
                      Number.isFinite(Number(s?.sessions_count)) && Number(s?.sessions_count) > 0
                        ? Number(s?.sessions_count)
                        : pricePerSession
                        ? 1
                        : undefined;

                    const packages_count =
                      Number.isFinite(Number(s?.packages_count)) && Number(s?.packages_count) > 0
                        ? Number(s?.packages_count)
                        : pricePerPackage
                        ? 1
                        : undefined;

                    return {
                      subTherapyId: String(s.subTherapyId),
                      pricePerSession,
                      pricePerPackage,
                      sessions_count,
                      packages_count,
                    };
                  })
                : [],
              therapyTestsEnabled: !!t.therapyTestsEnabled,
              tests: Array.isArray(t.tests) ? t.tests.map((x) => ({ testId: String(x.testId) })) : [],
            }))
          : [];

        const uniqueTherapyIds = [...new Set(planFromSnapshot.map((t) => t.therapyId))];
        await Promise.all(uniqueTherapyIds.map((tid) => loadCatalogForTherapy(tid)));

        setTherapyPlan(planFromSnapshot);

        setFormData({
          p_id: c.p_id || "",
          patient_name: c.patient_name || "",
          patient_phone: c.patient_phone || "",
          patient_phone_alt: c.patient_phone_alt || "",
          gender: c.gender || "",
          dob: c.dob ? c.dob.split("T")[0] : "",
          age: c.age ?? "",
          joining_date: c.joining_date ? c.joining_date.split("T")[0] : "",
          grant_app_access: !!c.grant_app_access,
          address:
            c.address || {
              line1: "",
              line2: "",
              country: "",
              state: "",
              city: "",
              pincode: "",
            },
          case_type: c.case_type || "",
          description: c.description || "",
          therapies: c.therapies || [],
          conditions: c.conditions || [],
          other_details: {
            father: c.other_details?.father || { name: "", occupation: "" },
            mother: c.other_details?.mother || { name: "", occupation: "" },
            husband: c.other_details?.husband || { name: "", occupation: "" },
            spouse: c.other_details?.spouse || { name: "", occupation: "" },
            additional_info: c.other_details?.additional_info || "",
          },
        });
      } catch (err) {
        console.error(err);
        setError("❌ Failed to load case data.");
      } finally {
        setLoading(false);
      }
    };

    if (isUpdate) fetchCase();
  }, [caseId, isUpdate, authHeaders, loadCatalogForTherapy]);

  // ---------- validation ----------
  const REQUIRED_FIELDS = [
    "patient_name",
    "patient_phone",
    "gender",
    "dob",
    "joining_date",
    "address.line1",
    "address.pincode",
  ];

  const validate = (data) => {
    const nextErrors = {};
    const get = (obj, path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

    REQUIRED_FIELDS.forEach((key) => {
      const v = get(data, key);
      if (v === undefined || v === null || String(v).trim() === "") {
        nextErrors[key] = `Please fill this field (${key}).`;
      }
    });

    if (data.patient_phone && !/^[0-9+\-\s()]{7,15}$/.test(data.patient_phone)) {
      nextErrors["patient_phone"] = "Enter a valid phone number.";
    }

    if (data.dob && data.joining_date) {
      const dob = new Date(data.dob);
      const join = new Date(data.joining_date);
      if (dob.toString() !== "Invalid Date" && join.toString() !== "Invalid Date" && join < dob) {
        nextErrors["joining_date"] = "Joining date cannot be before D.O.B.";
      }
    }

    return nextErrors;
  };

  const clearError = (key) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // ---------- handlers ----------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setFormData((p) => ({ ...p, [name]: val }));
    clearError(name);
  };

  // Client ID change
  const handlePidChange = (e) => {
    const val = e.target.value;
    setFormData((p) => ({ ...p, p_id: val }));
    clearError("p_id");
    setPidStatus({ state: "idle", msg: "" });
  };

  const handleAddressChange = (e) => {
    const k = e.target.name;
    setFormData((p) => ({
      ...p,
      address: { ...p.address, [k]: e.target.value },
    }));
    clearError(`address.${k}`);
  };

  const handleOtherDetailsChange = (e, parent = null) => {
    const { name, value } = e.target;
    if (parent) {
      setFormData((p) => ({
        ...p,
        other_details: {
          ...p.other_details,
          [parent]: { ...p.other_details[parent], [name]: value },
        },
      }));
    } else {
      setFormData((p) => ({
        ...p,
        other_details: { ...p.other_details, [name]: value },
      }));
    }
  };

  const handleMultiSelectChange = (e, key) => {
    const { options } = e.target;
    const selected = [];
    for (let i = 0; i < options.length; i++) if (options[i].selected) selected.push(options[i].value);
    setFormData((p) => ({ ...p, [key]: selected }));
  };

  // ✅ DOB → Age
  const handleDobChange = (e) => {
    const dob = e.target.value;
    lastEditedRef.current = "dob";
    setFormData((p) => {
      const nextAge = calcAgeFromDob(dob);
      return { ...p, dob, age: nextAge };
    });
    clearError("dob");
  };

  // ✅ Age → DOB
  const handleAgeChange = (e) => {
    const age = e.target.value;
    lastEditedRef.current = "age";
    setFormData((p) => {
      if (age === "" || age == null) return { ...p, age };
      const nextDob = calcDobFromAge(age);
      return { ...p, age, dob: nextDob || p.dob };
    });
    clearError("age");
  };

  // If case is loaded (update mode), ensure sync if only one exists
  useEffect(() => {
    setFormData((p) => {
      if (p.dob && p.age !== "" && p.age != null) return p;
      if (p.dob && (p.age === "" || p.age == null)) return { ...p, age: calcAgeFromDob(p.dob) };
      if (!p.dob && p.age !== "" && p.age != null) return { ...p, dob: calcDobFromAge(p.age) };
      return p;
    });
  }, [isUpdate, loading]);

  // --------- Conditions manual input helpers ----------
  const addCondition = (raw) => {
    const t = (raw || "").trim();
    if (!t) return;
    setFormData((p) => {
      const exists = p.conditions.some((c) => c.toLowerCase() === t.toLowerCase());
      if (exists) return p;
      return { ...p, conditions: [...p.conditions, t] };
    });
    setConditionInput("");
  };

  const addConditionsFromInput = (str) => {
    (str || "")
      .split(/[,\n;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(addCondition);
  };

  const removeCondition = (label) => {
    setFormData((p) => ({
      ...p,
      conditions: p.conditions.filter((c) => c !== label),
    }));
  };

  const clearAllConditions = () => {
    setFormData((p) => ({ ...p, conditions: [] }));
  };

  const onConditionKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addConditionsFromInput(conditionInput);
    }
  };

  // --------- plan builder helpers ----------
  const addTherapyToPlan = async (therapyId) => {
    const tid = String(therapyId);
    if (!tid) return;
    if (therapyPlan.find((t) => String(t.therapyId) === tid)) return;
    await loadCatalogForTherapy(tid);
    setTherapyPlan((p) => [...p, { therapyId: tid, subTherapy: [], therapyTestsEnabled: false, tests: [] }]);
    clearError("therapy_plan");
  };

  const removeTherapyFromPlan = (therapyId) => {
    const tid = String(therapyId);
    setTherapyPlan((p) => p.filter((t) => String(t.therapyId) !== tid));
    setTestSearch((s) => {
      const copy = { ...s };
      delete copy[tid];
      return copy;
    });
  };

  // ✅ Mutual exclusive: perSession OR perPackage (checkboxes)
  const setSubTherapyBilling = (therapyId, subTherapyId, mode, checked) => {
    const tid = String(therapyId);
    const sid = String(subTherapyId);

    setTherapyPlan((prev) =>
      prev.map((blk) => {
        if (String(blk.therapyId) !== tid) return blk;

        const exists = blk.subTherapy.find((s) => String(s.subTherapyId) === sid);

        if (!checked) {
          return { ...blk, subTherapy: blk.subTherapy.filter((s) => String(s.subTherapyId) !== sid) };
        }

        const next = {
          subTherapyId: sid,
          pricePerSession: mode === "session",
          pricePerPackage: mode === "package",
          sessions_count: mode === "session" ? Math.max(1, Number(exists?.sessions_count || 1)) : undefined,
          packages_count: mode === "package" ? Math.max(1, Number(exists?.packages_count || 1)) : undefined,
        };

        if (!exists) return { ...blk, subTherapy: [...blk.subTherapy, next] };

        return {
          ...blk,
          subTherapy: blk.subTherapy.map((s) => (String(s.subTherapyId) === sid ? next : s)),
        };
      })
    );
  };

  const setSubTherapyQty = (therapyId, subTherapyId, field, rawVal) => {
    const tid = String(therapyId);
    const sid = String(subTherapyId);
    const n = Math.max(1, Number(rawVal || 1) || 1);

    setTherapyPlan((prev) =>
      prev.map((blk) => {
        if (String(blk.therapyId) !== tid) return blk;
        const exists = blk.subTherapy.find((s) => String(s.subTherapyId) === sid);
        if (!exists) return blk;

        if (field === "sessions_count" && !exists.pricePerSession) return blk;
        if (field === "packages_count" && !exists.pricePerPackage) return blk;

        return {
          ...blk,
          subTherapy: blk.subTherapy.map((s) => (String(s.subTherapyId) === sid ? { ...s, [field]: n } : s)),
        };
      })
    );
  };

  const clearSubTherapySelection = (therapyId, subTherapyId) => {
    const tid = String(therapyId);
    const sid = String(subTherapyId);
    setTherapyPlan((prev) =>
      prev.map((blk) => {
        if (String(blk.therapyId) !== tid) return blk;
        return { ...blk, subTherapy: blk.subTherapy.filter((s) => String(s.subTherapyId) !== sid) };
      })
    );
  };

  const toggleTherapyTestsEnabled = (therapyId) => {
    const tid = String(therapyId);
    loadCatalogForTherapy(tid);
    setTherapyPlan((prev) =>
      prev.map((blk) =>
        String(blk.therapyId) === tid ? { ...blk, therapyTestsEnabled: !blk.therapyTestsEnabled } : blk
      )
    );
  };

  const toggleTestInPlan = (therapyId, testId) => {
    const tid = String(therapyId);
    const xid = String(testId);
    setTherapyPlan((prev) =>
      prev.map((blk) => {
        if (String(blk.therapyId) !== tid) return blk;
        const exists = blk.tests.find((t) => String(t.testId) === xid);
        return exists
          ? { ...blk, tests: blk.tests.filter((t) => String(t.testId) !== xid) }
          : { ...blk, tests: [...blk.tests, { testId: xid }] };
      })
    );
  };

  const setAllTestsForTherapy = (therapyId) => {
    const tid = String(therapyId);
    const all = (catalogs[tid]?.tests || []).map((t) => ({ testId: String(t._id) }));
    setTherapyPlan((prev) => prev.map((blk) => (String(blk.therapyId) === tid ? { ...blk, tests: all } : blk)));
  };

  const clearAllTestsForTherapy = (therapyId) => {
    const tid = String(therapyId);
    setTherapyPlan((prev) => prev.map((blk) => (String(blk.therapyId) === tid ? { ...blk, tests: [] } : blk)));
  };

  const therapyNameById = useMemo(
    () => Object.fromEntries(therapyList.map((t) => [String(t._id), t.name])),
    [therapyList]
  );

  const fieldCls = (key) => `${baseInputCls} ${errors[key] ? errorBorder : normalBorder}`;
  const ErrorText = ({ msg }) => (msg ? <p className="text-sm text-red-600 mt-1">{msg}</p> : null);

  // ---------- Client ID verify call ----------
  const verifyPid = async () => {
    try {
      const val = String(formData.p_id || "");
      if (!val) {
        setPidStatus({ state: "invalid", msg: "Enter a Client ID to verify" });
        return;
      }

      setPidStatus({ state: "checking", msg: "Checking..." });

      const res = await api.get(`/cases/verify-pid`, {
        headers: authHeaders,
        params: { p_id: val },
      });

      if (res.data?.available) {
        setPidStatus({ state: "available", msg: "Available" });
      } else {
        setPidStatus({ state: "unavailable", msg: res.data?.message || "Already in use" });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Verification failed";
      setPidStatus({ state: "error", msg });
    }
  };

  // ---------- submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    const nextErrors = validate(formData);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstKey = Object.keys(nextErrors)[0];
      const firstId = idFromKey(firstKey);
      const el = document.getElementById(firstId);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (!isUpdate && formData.p_id && pidStatus.state !== "available") {
      setErrors((p) => ({ ...p, p_id: "Please click Verify and ensure the Client ID is available." }));
      const el = document.getElementById(idFromKey("p_id"));
      if (el) el.focus();
      return;
    }

    try {
      const payload = {
        p_id: formData.p_id ? String(formData.p_id) : undefined,
        patient_name: formData.patient_name,
        patient_phone: formData.patient_phone,
        patient_phone_alt: formData.patient_phone_alt,
        gender: formData.gender,
        dob: formData.dob,
        age: formData.age || undefined,
        joining_date: formData.joining_date,
        grant_app_access: !!formData.grant_app_access,
        address: formData.address,
        case_type: formData.case_type || undefined,
        description: formData.description || "",
        therapies: formData.therapies || [],
        conditions: formData.conditions || [],
        other_details: formData.other_details || {},
        therapy_plan: therapyPlan.map((t) => ({
          ...t,
          subTherapy: (t.subTherapy || []).map((s) => ({
            subTherapyId: s.subTherapyId,
            pricePerSession: !!s.pricePerSession,
            pricePerPackage: !!s.pricePerPackage,
            sessions_count: s.pricePerSession ? Math.max(1, Number(s.sessions_count || 1)) : undefined,
            packages_count: s.pricePerPackage ? Math.max(1, Number(s.packages_count || 1)) : undefined,
          })),
        })),
      };

      if (isUpdate) {
        await api.patch(`/update-case/${caseId}`, payload, { headers: authHeaders });
        setSuccess("💾 Case updated successfully!");
        navigate("/admin/view-cases");
      } else {
        await api.post(`/create-cases`, payload, { headers: authHeaders });
        setSuccess("✅ Case created successfully!");
        navigate("/admin/view-cases");
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || "❌ Failed to submit form.");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-white py-12 px-4 sm:px-10 lg:px-24">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-3xl font-extrabold text-indigo-700">
              {isUpdate ? "✏️ Update Case" : "📝 Create New Case"}
            </h1>
            <span className="text-sm text-gray-500">
              <span className="text-red-600">*</span> Required fields
            </span>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-400 text-green-700 p-3 rounded">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 p-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-10">
            {/* Patient Info */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">👤 Client Details</h2>

              {!isUpdate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700 mb-1 block">
                      Client ID (optional, click Verify)
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={idFromKey("p_id")}
                        type="text"
                        name="p_id"
                        value={formData.p_id}
                        onChange={handlePidChange}
                        placeholder="Enter Client ID (e.g., 1, ABC123)"
                        className={fieldCls("p_id")}
                      />
                      <button
                        type="button"
                        onClick={verifyPid}
                        className="whitespace-nowrap px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                      >
                        Verify
                      </button>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      {pidStatus.state === "checking" && <span className="text-sm text-gray-600">Checking…</span>}
                      {pidStatus.state === "available" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Available
                        </span>
                      )}
                      {pidStatus.state === "unavailable" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                          Not available
                        </span>
                      )}
                      {(pidStatus.state === "invalid" || pidStatus.state === "error") && (
                        <span className="text-xs text-rose-600">{pidStatus.msg}</span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      Client ID is a unique code for this client. Leave blank to auto-generate on the server.
                    </p>
                    <ErrorText msg={errors["p_id"]} />
                  </div>
                </div>
              )}

              {isUpdate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700 mb-1 block">Client ID</label>
                    <input
                      id={idFromKey("p_id")}
                      type="text"
                      name="p_id"
                      value={formData.p_id}
                      readOnly
                      disabled
                      className={`${baseInputCls} ${normalBorder} bg-gray-100`}
                      placeholder="Client ID"
                      title="Unique Client ID (auto-generated)"
                    />
                  </div>
                  <div className="text-sm text-gray-600 flex items-end">Client ID is immutable after creation.</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={idFromKey("patient_name")}
                    type="text"
                    name="patient_name"
                    value={formData.patient_name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    className={fieldCls("patient_name")}
                  />
                  <ErrorText msg={errors["patient_name"]} />
                </div>

                {/* Primary Phone */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    Primary Phone Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={idFromKey("patient_phone")}
                    type="text"
                    name="patient_phone"
                    value={formData.patient_phone}
                    onChange={handleChange}
                    placeholder="Primary Phone Number"
                    className={fieldCls("patient_phone")}
                  />
                  <ErrorText msg={errors["patient_phone"]} />
                </div>

                {/* Alt Phone */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">Alternate Phone Number</label>
                  <input
                    id={idFromKey("patient_phone_alt")}
                    type="text"
                    name="patient_phone_alt"
                    value={formData.patient_phone_alt}
                    onChange={handleChange}
                    placeholder="Alternate Phone Number"
                    className={`${baseInputCls} ${normalBorder}`}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    Gender <span className="text-red-600">*</span>
                  </label>
                  <select
                    id={idFromKey("gender")}
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={fieldCls("gender")}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ErrorText msg={errors["gender"]} />
                </div>

                {/* DOB */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    Date of Birth (D.O.B.) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={idFromKey("dob")}
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleDobChange}
                    className={fieldCls("dob")}
                  />
                  <ErrorText msg={errors["dob"]} />
                </div>

                {/* Age */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">Age (optional)</label>
                  <input
                    id={idFromKey("age")}
                    type="number"
                    min="0"
                    name="age"
                    value={formData.age}
                    onChange={handleAgeChange}
                    placeholder="Age"
                    className={`${baseInputCls} ${normalBorder}`}
                  />
                </div>

                {/* Joining Date */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    Joining Date (Start of Care) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={idFromKey("joining_date")}
                    type="date"
                    name="joining_date"
                    value={formData.joining_date}
                    onChange={handleChange}
                    className={fieldCls("joining_date")}
                  />
                  <ErrorText msg={errors["joining_date"]} />
                </div>

                {/* Grant App Access */}
                <div className="flex items-center gap-3">
                  <input
                    id={idFromKey("grant_app_access")}
                    type="checkbox"
                    name="grant_app_access"
                    checked={!!formData.grant_app_access}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <label htmlFor={idFromKey("grant_app_access")} className="text-sm text-gray-700">
                    Grant patient app access
                  </label>
                </div>
              </div>
            </section>

            {/* Address */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">🏠 Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "line1", label: "Address Line 1", required: true },
                  { key: "line2", label: "Address Line 2", required: false },
                  { key: "country", label: "Country", required: false },
                  { key: "state", label: "State", required: false },
                  { key: "city", label: "City", required: false },
                  { key: "pincode", label: "Pincode", required: true },
                ].map(({ key, label, required }) => {
                  const errorKey = `address.${key}`;
                  return (
                    <div key={key}>
                      <label className="text-sm text-gray-700 mb-1 block">
                        {label} {required && <span className="text-red-600">*</span>}
                      </label>
                      <input
                        id={idFromKey(errorKey)}
                        type="text"
                        name={key}
                        value={formData.address[key]}
                        onChange={handleAddressChange}
                        placeholder={label}
                        className={required ? fieldCls(errorKey) : `${baseInputCls} ${normalBorder}`}
                      />
                      <ErrorText msg={errors[errorKey]} />
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Case Info */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">📂 Case Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">Case Type (free-text or pick)</label>
                  <input
                    id={idFromKey("case_type")}
                    type="text"
                    name="case_type"
                    list="caseType_suggestions"
                    value={formData.case_type}
                    onChange={handleChange}
                    placeholder="Type to add (e.g., Ortho)"
                    className={`${baseInputCls} ${normalBorder}`}
                  />
                  <datalist id="caseType_suggestions">
                    {caseTypeOptions.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-1 block">Description (optional)</label>
                <textarea
                  id={idFromKey("description")}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Description"
                  rows={4}
                  className={`${baseInputCls} ${normalBorder}`}
                />
              </div>
            </section>

            {/* Legacy Text Therapies */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">🏷️ Therapy Tags (optional)</h2>
              <p className="text-sm text-gray-600">Optional free-text tags you used earlier. Safe to ignore now.</p>
              <input
                id={idFromKey("therapies")}
                type="text"
                name="therapies_input"
                value={formData.therapies.join(", ")}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    therapies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
                placeholder="Comma-separated (e.g., Occupational, Physiotherapy)"
                className={`${baseInputCls} ${normalBorder}`}
              />
            </section>

            {/* Conditions chip input */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-800">⚕️ Conditions (manual add or pick)</h2>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="text"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyDown={onConditionKeyDown}
                  list="condition_suggestions"
                  placeholder="Type a condition and press Enter (or use commas)"
                  className={`${baseInputCls} ${normalBorder} min-w-[220px]`}
                />
                <datalist id="condition_suggestions">
                  {conditionOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>

                <button
                  type="button"
                  className="text-xs px-3 py-2 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => addConditionsFromInput(conditionInput)}
                >
                  Add
                </button>

                <button
                  type="button"
                  className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => setFormData((p) => ({ ...p, conditions: [] }))}
                  disabled={!formData.conditions.length}
                >
                  Clear all
                </button>

                <div className="text-xs text-gray-500">
                  Total: <span className="font-medium">{formData.conditions.length}</span>
                </div>
              </div>

              {!!formData.conditions.length && (
                <div className="flex flex-wrap gap-2">
                  {formData.conditions.map((cond) => (
                    <span
                      key={cond}
                      className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-2"
                    >
                      {cond}
                      <button
                        type="button"
                        className="text-indigo-700 hover:text-indigo-900"
                        onClick={() => removeCondition(cond)}
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Therapy Plan Builder */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">🩺 Therapy Plan (builder)</h2>
              <p className="text-sm text-gray-600">
                Add therapies, select <b>either</b> Per Session or Per Package for each sub-therapy, and provide quantity.
                Click/hover “View” to see pricing.
              </p>

              {/* Add Therapy Row */}
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <select
                  id="add_therapy_select"
                  className={`${baseInputCls} ${normalBorder} min-w-[240px]`}
                  disabled={therapyLoading}
                  defaultValue=""
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (!val) return;
                    await addTherapyToPlan(val);
                    e.target.value = "";
                  }}
                >
                  <option value="">➕ Add a Therapy…</option>
                  {therapyList
                    .filter((t) => !therapyPlan.some((blk) => String(blk.therapyId) === String(t._id)))
                    .map((t) => (
                      <option key={t._id} value={String(t._id)}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <ErrorText msg={errors["therapy_plan"]} />

              {/* Plan Blocks */}
              <div className="space-y-6">
                {therapyPlan.map((blk, idx) => {
                  const tid = String(blk.therapyId);
                  const cat = catalogs[tid] || { subtherapies: [], tests: [] };
                  const isCatLoading = !!catalogLoading[tid];

                  const testNameById = Object.fromEntries((cat.tests || []).map((t) => [String(t._id), t.name]));
                  const search = (testSearch[tid] || "").toLowerCase();
                  const filteredTests = (cat.tests || []).filter((t) => t.name?.toLowerCase().includes(search));

                  return (
                    <div key={`${tid}-${idx}`} className="border rounded-lg p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="font-semibold text-indigo-700">{therapyNameById[tid] || "Therapy"}</div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => loadCatalogForTherapy(tid)}
                            className="text-sm text-indigo-600 underline"
                            disabled={isCatLoading}
                          >
                            {isCatLoading ? "Loading…" : "Refresh options"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTherapyFromPlan(tid)}
                            className="text-sm text-rose-600 underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Sub-therapies table */}
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-600 border-b">
                              <th className="py-2 pr-4">Sub-Therapy</th>
                              <th className="py-2 pr-4">Per Session</th>
                              <th className="py-2 pr-4">Sessions Qty</th>
                              <th className="py-2 pr-4">Per Package</th>
                              <th className="py-2 pr-4">Packages Qty</th>
                              <th className="py-2 pr-4">Details</th>
                              <th className="py-2 pr-4">Clear</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cat.subtherapies.map((s) => {
                              const sid = String(s._id);
                              const existing = blk.subTherapy.find((x) => String(x.subTherapyId) === sid);

                              const perSession = !!existing?.pricePerSession;
                              const perPackage = !!existing?.pricePerPackage;

                              const sessionsCount = perSession ? Number(existing?.sessions_count || 1) : 1;
                              const packagesCount = perPackage ? Number(existing?.packages_count || 1) : 1;

                              // ✅ adapt to whatever keys backend sends (safe fallbacks)
                              const pricePerSessionVal = Number(s?.price_per_session ?? s?.pricePerSession ?? 0);
                              const pricePerPackageVal = Number(s?.price_per_package ?? s?.pricePerPackage ?? 0);
                              const defaultSessionsPerPackage = Number(
                                s?.default_sessions_per_package ?? s?.sessions_per_package ?? 1
                              );
                              const durationMins = s?.duration_mins ?? s?.duration ?? null;

                              const tooltipContent = (
                                <div className="w-[280px]">
                                  <div className="text-sm font-semibold text-gray-900 mb-2">
                                    {s.name} — Pricing
                                  </div>
                                  <div className="text-xs text-gray-700 space-y-1">
                                    <div className="flex justify-between gap-3">
                                      <span>Per Session</span>
                                      <span className="font-medium">₹ {pricePerSessionVal}</span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                      <span>Per Package</span>
                                      <span className="font-medium">₹ {pricePerPackageVal}</span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                      <span>Sessions / Package</span>
                                      <span className="font-medium">{defaultSessionsPerPackage}</span>
                                    </div>
                                    {!!durationMins && (
                                      <div className="flex justify-between gap-3">
                                        <span>Duration</span>
                                        <span className="font-medium">{durationMins} mins</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-2 text-[11px] text-gray-500">
                                    Tip: Tick only one (Per Session or Per Package). Quantity input will appear accordingly.
                                  </div>
                                </div>
                              );

                              return (
                                <tr key={sid} className="border-b last:border-b-0">
                                  <td className="py-2 pr-4">
                                    <div className="font-medium text-gray-900">{s.name}</div>
                                    {!!durationMins && (
                                      <div className="text-xs text-gray-500">Duration: {durationMins} mins</div>
                                    )}
                                  </td>

                                  <td className="py-2 pr-4">
                                    <input
                                      type="checkbox"
                                      checked={perSession}
                                      onChange={(e) => setSubTherapyBilling(tid, sid, "session", e.target.checked)}
                                      title="Choose Per Session"
                                    />
                                  </td>

                                  <td className="py-2 pr-4">
                                    {perSession ? (
                                      <input
                                        type="number"
                                        min={1}
                                        value={sessionsCount}
                                        onChange={(e) => setSubTherapyQty(tid, sid, "sessions_count", e.target.value)}
                                        className="border rounded px-2 py-1 w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Sessions"
                                      />
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                  </td>

                                  <td className="py-2 pr-4">
                                    <input
                                      type="checkbox"
                                      checked={perPackage}
                                      onChange={(e) => setSubTherapyBilling(tid, sid, "package", e.target.checked)}
                                      title="Choose Per Package"
                                    />
                                  </td>

                                  <td className="py-2 pr-4">
                                    {perPackage ? (
                                      <input
                                        type="number"
                                        min={1}
                                        value={packagesCount}
                                        onChange={(e) => setSubTherapyQty(tid, sid, "packages_count", e.target.value)}
                                        className="border rounded px-2 py-1 w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Packages"
                                      />
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                  </td>

                                  {/* ✅ FIXED tooltip: rendered in body (no overflow clipping) */}
                                  <td className="py-2 pr-4">
                                    <Tippy
                                      content={tooltipContent}
                                      theme="light-border"
                                      placement="right"
                                      interactive
                                      appendTo={() => document.body}
                                      maxWidth={320}
                                      delay={[80, 0]}
                                    >
                                      <button
                                        type="button"
                                        className="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                      >
                                        View
                                      </button>
                                    </Tippy>
                                  </td>

                                  <td className="py-2 pr-4">
                                    {(perSession || perPackage) ? (
                                      <button
                                        type="button"
                                        onClick={() => clearSubTherapySelection(tid, sid)}
                                        className="text-xs px-2 py-1 rounded border border-rose-300 text-rose-700 hover:bg-rose-50"
                                        title="Clear selection"
                                      >
                                        Clear
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {!cat.subtherapies.length && (
                              <tr>
                                <td className="py-2 text-gray-500" colSpan={7}>
                                  {isCatLoading ? "Loading sub-therapies…" : "No sub-therapies configured."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        {!!cat.subtherapies.length && (
                          <div className="mt-2 text-xs text-gray-500">
                            Note: Selecting <b>Per Session</b> will automatically unselect <b>Per Package</b> (and vice versa).
                          </div>
                        )}
                      </div>

                      {/* Tests */}
                      <div className="mt-6">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!blk.therapyTestsEnabled}
                            onChange={() => toggleTherapyTestsEnabled(tid)}
                          />
                          <span className="text-sm text-gray-700">Enable tests for this therapy</span>
                        </label>

                        {blk.therapyTestsEnabled && (
                          <div className="mt-3 space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                              <input
                                type="text"
                                placeholder="Search tests…"
                                value={testSearch[tid] || ""}
                                onChange={(e) => setTestSearch((s) => ({ ...s, [tid]: e.target.value }))}
                                className={`${baseInputCls} ${normalBorder} min-w-[220px]`}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="text-xs px-3 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                  onClick={() => setAllTestsForTherapy(tid)}
                                  disabled={!cat.tests.length}
                                >
                                  Select all
                                </button>
                                <button
                                  type="button"
                                  className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                                  onClick={() => clearAllTestsForTherapy(tid)}
                                  disabled={!blk.tests.length}
                                >
                                  Clear
                                </button>
                              </div>
                              <div className="text-xs text-gray-500">
                                Selected: <span className="font-medium">{blk.tests.length}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {filteredTests.map((t) => {
                                const xid = String(t._id);
                                const checked = !!blk.tests.find((x) => String(x.testId) === xid);
                                return (
                                  <label key={xid} className="flex items-center gap-2 border rounded p-2">
                                    <input type="checkbox" checked={checked} onChange={() => toggleTestInPlan(tid, xid)} />
                                    <span className="text-sm">{t.name}</span>
                                  </label>
                                );
                              })}
                              {!filteredTests.length && (
                                <div className="text-sm text-gray-500">
                                  {isCatLoading
                                    ? "Loading tests…"
                                    : cat.tests?.length
                                    ? "No tests match your search."
                                    : "No tests configured for this therapy."}
                                </div>
                              )}
                            </div>

                            {!!blk.tests.length && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {blk.tests.map(({ testId }) => (
                                  <span
                                    key={testId}
                                    className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-2"
                                  >
                                    {testNameById[testId] || testId}
                                    <button
                                      type="button"
                                      className="text-indigo-700 hover:text-indigo-900"
                                      onClick={() => toggleTestInPlan(tid, testId)}
                                      title="Remove"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {!therapyPlan.length && <div className="text-sm text-gray-500">No therapies added yet.</div>}
              </div>
            </section>

            <div className="text-center pt-6">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg shadow transition duration-200"
              >
                {isUpdate ? "💾 Update Case" : "➕ Create Case"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
