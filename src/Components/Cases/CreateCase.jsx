import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

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
const todayISO = () => toISODate(new Date());

function isValidDateString(s) {
  if (!s) return false;
  const d = new Date(s);
  return d.toString() !== "Invalid Date";
}

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

// -------- Discount helpers --------
function computeDiscountPercent(discountSlabs, sessionsCount) {
  const n = Number(sessionsCount);
  if (!Number.isFinite(n) || n < 1) return 0;
  if (!Array.isArray(discountSlabs) || discountSlabs.length === 0) return 0;

  const slabs = discountSlabs
    .filter((x) => x && x.isActive !== false)
    .map((x) => ({
      min: Number(x.min_sessions),
      max: Number(x.max_sessions),
      pct: Number(x.discount_percent),
    }))
    .filter((x) => Number.isFinite(x.min) && Number.isFinite(x.max) && Number.isFinite(x.pct));

  const matches = slabs.filter((s) => n >= s.min && n <= s.max);
  if (!matches.length) return 0;

  matches.sort((a, b) => b.min - a.min);
  const pct = matches[0].pct;
  if (!Number.isFinite(pct) || pct < 0) return 0;
  return Math.min(100, pct);
}

function formatSlabs(discountSlabs) {
  if (!Array.isArray(discountSlabs) || discountSlabs.length === 0) return "No slabs";
  const active = discountSlabs.filter((x) => x && x.isActive !== false);
  if (!active.length) return "No active slabs";
  const sorted = [...active].sort((a, b) => Number(a.min_sessions || 0) - Number(b.min_sessions || 0));
  return sorted.map((s) => `${s.min_sessions}-${s.max_sessions}: ${s.discount_percent}%`).join(", ");
}

// ---- numeric client_id helper ----
const toPositiveInt = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
};

export default function CreateCase() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const isUpdate = Boolean(caseId);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` }),
    []
  );

  const lastEditedRef = useRef(null);

  const [formData, setFormData] = useState({
    client_id: "",
    patient_name: "",
    patient_phone: "",
    patient_phone_alt: "",
    gender: "",
    dob: "",
    age: "",
    joining_date: "",
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

  // ✅ Therapy Plan builder state (still used for selecting items)
  const [therapyPlan, setTherapyPlan] = useState([]);
  const [therapyList, setTherapyList] = useState([]);
  const [therapyLoading, setTherapyLoading] = useState(false);
  const [catalogs, setCatalogs] = useState({});
  const [catalogLoading, setCatalogLoading] = useState({});
  const [testSearch, setTestSearch] = useState({});

  // Conditions chip input
  const [conditionInput, setConditionInput] = useState("");

  // Client ID verify state
  const [clientIdStatus, setClientIdStatus] = useState({ state: "idle", msg: "", data: null });

  const [existingItems, setExistingItems] = useState([]); // update mode: existing line items from backend

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!!caseId);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // default joining date
  useEffect(() => {
    if (!isUpdate) {
      const todayStr = todayISO();
      setFormData((p) => ({ ...p, joining_date: p.joining_date || todayStr }));
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
          [key]: { subtherapies: subs?.data?.items || [], tests: tests?.data?.items || [] },
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setCatalogLoading((p) => ({ ...p, [key]: false }));
      }
    },
    [authHeaders, catalogs]
  );

  useEffect(() => {
    fetchTherapies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- fetch case + items (update mode) ----------
  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await api.get(`/cases/${caseId}`, { headers: authHeaders });
        const c = res.data?.data || res.data || {};

        // also fetch line items (explicit) to support delete diff
        const itemsRes = await api.get(`/cases/${caseId}/line-items`, { headers: authHeaders });
        const lineItems = itemsRes.data?.data || [];
        setExistingItems(Array.isArray(lineItems) ? lineItems : []);

        // build therapyPlan from CaseItems (SUB/TEST)
        const byTherapy = new Map(); // tid -> blk
        for (const it of lineItems) {
          const tid = String(it.therapyId);
          if (!byTherapy.has(tid)) {
            byTherapy.set(tid, {
              therapyId: tid,
              therapy_name: it.therapy_name || "",
              subTherapy: [],
              therapyTestsEnabled: false,
              tests: [],
            });
          }
          const blk = byTherapy.get(tid);

          if (it.item_type === "SUB") {
            blk.subTherapy.push({
              subTherapyId: String(it.subTherapyId),
              sessions_count: Number(it.sessions_count || 1),
              discount_percent: Number(it.discount_percent || 0),
              start_date: it.start_date ? String(it.start_date).split("T")[0] : todayISO(),
              end_date: it.end_date ? String(it.end_date).split("T")[0] : "",
            });
          }

          if (it.item_type === "TEST") {
            blk.therapyTestsEnabled = true;
            blk.tests.push({ testId: String(it.testId) });
          }
        }

        const plan = [...byTherapy.values()].map((x) => ({
          therapyId: x.therapyId,
          subTherapy: x.subTherapy,
          therapyTestsEnabled: x.therapyTestsEnabled,
          tests: x.tests,
        }));

        const uniqueTherapyIds = [...new Set(plan.map((t) => t.therapyId))];
        await Promise.all(uniqueTherapyIds.map((tid) => loadCatalogForTherapy(tid)));

        setTherapyPlan(plan);

        setFormData({
          client_id: c.client_id ?? "",
          patient_name: c.patient_name || "",
          patient_phone: c.patient_phone || "",
          patient_phone_alt: c.patient_phone_alt || "",
          gender: c.gender || "",
          dob: c.dob ? String(c.dob).split("T")[0] : "",
          age: c.age ?? "",
          joining_date: c.joining_date ? String(c.joining_date).split("T")[0] : "",
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

        // update mode => client_id immutable, mark verified state as ok
        if (c.client_id != null) {
          setClientIdStatus({ state: "locked", msg: "Client ID is immutable", data: null });
        }
      } catch (err) {
        console.error(err);
        setError("❌ Failed to load case data.");
      } finally {
        setLoading(false);
      }
    };

    if (isUpdate) fetchCase();
    else setLoading(false);
  }, [caseId, isUpdate, authHeaders, loadCatalogForTherapy]);

  // normalize discounts & default start_date when catalogs load
  useEffect(() => {
    if (!therapyPlan.length) return;

    setTherapyPlan((prev) =>
      prev.map((blk) => {
        const tid = String(blk.therapyId);
        const subList = catalogs[tid]?.subtherapies || [];
        if (!subList.length) return blk;

        const byId = Object.fromEntries(subList.map((x) => [String(x._id), x]));

        const nextSub = (blk.subTherapy || []).map((row) => {
          const s = byId[String(row.subTherapyId)];
          const sessions = Number(row.sessions_count || 0);
          const computed = s ? computeDiscountPercent(s.discountSlabs, sessions) : 0;

          return {
            ...row,
            discount_percent:
              Number.isFinite(Number(row.discount_percent)) && Number(row.discount_percent) >= 0
                ? Number(row.discount_percent)
                : computed,
            start_date: row.start_date || todayISO(),
          };
        });

        return { ...blk, subTherapy: nextSub };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogs]);

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

    // client_id required for create mode
    if (!isUpdate) {
      const cid = toPositiveInt(data.client_id);
      if (!cid) nextErrors["client_id"] = "client_id must be a positive integer (1,2,3..).";
    }

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

    // validate subtherapy end_date >= start_date (frontend)
    for (const blk of therapyPlan) {
      for (const s of blk.subTherapy || []) {
        if (s.start_date && s.end_date) {
          const a = new Date(s.start_date);
          const b = new Date(s.end_date);
          if (a.toString() !== "Invalid Date" && b.toString() !== "Invalid Date" && b < a) {
            nextErrors["therapy_plan"] = "Some sub-therapies have end_date before start_date.";
            break;
          }
        }
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

  const handleClientIdChange = (e) => {
    const val = e.target.value;
    setFormData((p) => ({ ...p, client_id: val }));
    clearError("client_id");
    setClientIdStatus({ state: "idle", msg: "", data: null });
  };

  const handleAddressChange = (e) => {
    const k = e.target.name;
    setFormData((p) => ({ ...p, address: { ...p.address, [k]: e.target.value } }));
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

  const handleDobChange = (e) => {
    const dob = e.target.value;
    lastEditedRef.current = "dob";
    setFormData((p) => ({ ...p, dob, age: calcAgeFromDob(dob) }));
    clearError("dob");
  };

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
    setFormData((p) => ({ ...p, conditions: p.conditions.filter((c) => c !== label) }));
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

  const setSubTherapySessionsCount = (therapyId, subTherapyId, rawVal, subTherapyCatalogRow) => {
    const tid = String(therapyId);
    const sid = String(subTherapyId);

    if (rawVal === "" || rawVal === null || rawVal === undefined) {
      setTherapyPlan((prev) =>
        prev.map((blk) => {
          if (String(blk.therapyId) !== tid) return blk;
          return { ...blk, subTherapy: blk.subTherapy.filter((s) => String(s.subTherapyId) !== sid) };
        })
      );
      return;
    }

    const n = Math.max(1, Number(rawVal || 1) || 1);
    const disc = computeDiscountPercent(subTherapyCatalogRow?.discountSlabs, n);

    setTherapyPlan((prev) =>
      prev.map((blk) => {
        if (String(blk.therapyId) !== tid) return blk;
        const exists = blk.subTherapy.find((s) => String(s.subTherapyId) === sid);

        if (!exists) {
          return {
            ...blk,
            subTherapy: [
              ...blk.subTherapy,
              { subTherapyId: sid, sessions_count: n, discount_percent: disc, start_date: todayISO(), end_date: "" },
            ],
          };
        }

        return {
          ...blk,
          subTherapy: blk.subTherapy.map((s) =>
            String(s.subTherapyId) === sid
              ? { ...s, sessions_count: n, discount_percent: disc, start_date: s.start_date || todayISO() }
              : s
          ),
        };
      })
    );
  };

  const setSubTherapyDate = (therapyId, subTherapyId, field, value) => {
    const tid = String(therapyId);
    const sid = String(subTherapyId);

    setTherapyPlan((prev) =>
      prev.map((blk) => {
        if (String(blk.therapyId) !== tid) return blk;
        const exists = blk.subTherapy.find((s) => String(s.subTherapyId) === sid);
        if (!exists) return blk;

        return {
          ...blk,
          subTherapy: blk.subTherapy.map((s) => (String(s.subTherapyId) === sid ? { ...s, [field]: value } : s)),
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
      prev.map((blk) => (String(blk.therapyId) === tid ? { ...blk, therapyTestsEnabled: !blk.therapyTestsEnabled } : blk))
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

  // ---------- client_id verify call ----------
  const verifyClientId = async () => {
    try {
      const cid = toPositiveInt(formData.client_id);
      if (!cid) {
        setClientIdStatus({ state: "invalid", msg: "Enter a valid numeric Client ID (1,2,3..)", data: null });
        return;
      }

      setClientIdStatus({ state: "checking", msg: "Checking...", data: null });

      const res = await api.get(`/cases/verify-client-id/${cid}`, { headers: authHeaders });

      // backend response: { ok:true, exists:boolean, data:doc|null }
      if (res.data?.exists) {
        const doc = res.data?.data;
        setClientIdStatus({
          state: "unavailable",
          msg: `Client ID ${cid} already exists`,
          data: doc || null,
        });
      } else {
        setClientIdStatus({ state: "available", msg: `Client ID ${cid} is available`, data: null });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Verification failed";
      setClientIdStatus({ state: "error", msg, data: null });
    }
  };

  // ---------- build line-items payload from therapyPlan ----------
  const buildLineItemsPayload = () => {
    const items = [];

    for (const blk of therapyPlan) {
      const tid = String(blk.therapyId);
      const therapy_name = therapyNameById[tid] || blk.therapy_name || "Therapy";

      const cat = catalogs[tid] || { subtherapies: [], tests: [] };
      const subById = Object.fromEntries((cat.subtherapies || []).map((s) => [String(s._id), s]));
      const testById = Object.fromEntries((cat.tests || []).map((t) => [String(t._id), t]));

      // SUB
      for (const s of blk.subTherapy || []) {
        const sid = String(s.subTherapyId);
        const row = subById[sid];

        const price_per_session = Number(row?.price_per_session ?? row?.pricePerSession ?? 0) || 0;
        const duration_mins = Number(row?.duration_mins ?? row?.duration ?? 0) || 0;

        items.push({
          item_type: "SUB",
          therapyId: tid,
          therapy_name,
          subTherapyId: sid,
          name: row?.name || row?.title || "Sub Therapy",
          duration_mins: duration_mins || undefined,
          price_per_session,
          sessions_count: Math.max(1, Number(s.sessions_count || 1)),
          start_date: s.start_date || todayISO(),
          end_date: s.end_date || undefined,
          discount_percent: Number.isFinite(Number(s.discount_percent)) ? Number(s.discount_percent) : 0,
          discount: 0,
        });
      }

      // TEST
      if (blk.therapyTestsEnabled) {
        for (const t of blk.tests || []) {
          const xid = String(t.testId);
          const row = testById[xid];

          const price_per_test = Number(row?.price_per_test ?? row?.pricePerTest ?? 0) || 0;
          const duration_mins = Number(row?.duration_mins ?? row?.duration ?? 0) || 0;

          items.push({
            item_type: "TEST",
            therapyId: tid,
            therapy_name,
            testId: xid,
            name: row?.name || row?.title || "Test",
            duration_mins: duration_mins || undefined,
            price_per_test,
            discount_percent: 0,
            discount: 0,
          });
        }
      }
    }

    return { items };
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
      const el = document.getElementById(idFromKey(firstKey));
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // create mode => must verify available
    if (!isUpdate) {
      if (clientIdStatus.state !== "available") {
        setErrors((p) => ({ ...p, client_id: "Please click Verify and ensure the Client ID is available." }));
        const el = document.getElementById(idFromKey("client_id"));
        if (el) el.focus();
        return;
      }
    }

    try {
      // 1) Case payload
      const casePayload = {
        client_id: isUpdate ? undefined : toPositiveInt(formData.client_id),
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
      };

      let savedCaseId = caseId;

      // 2) Create / Update case
      if (isUpdate) {
        await api.patch(`/cases/${caseId}`, casePayload, { headers: authHeaders });
      } else {
        const created = await api.post(`/cases`, casePayload, { headers: authHeaders });
        const doc = created.data?.data || created.data;
        savedCaseId = doc?._id;
      }

      if (!savedCaseId) throw new Error("Case ID not found after save.");

      // 3) Sync line items:
      //    - update mode: delete items that are no longer selected
      //    - then upsert selected items
      const desiredPayload = buildLineItemsPayload();
      const desiredKeys = new Set();

      // derive desired item_code keys (must match backend logic)
      for (const it of desiredPayload.items) {
        if (it.item_type === "SUB") desiredKeys.add(`SUB|${it.therapyId}|${it.subTherapyId}`);
        if (it.item_type === "TEST") desiredKeys.add(`TEST|${it.therapyId}|${it.testId}`);
      }

      if (isUpdate && Array.isArray(existingItems) && existingItems.length) {
        const toRemove = existingItems.filter((x) => x?.status !== "removed" && !desiredKeys.has(String(x.item_code)));
        for (const rm of toRemove) {
          await api.delete(`/cases/${savedCaseId}/line-items/${rm._id}`, { headers: authHeaders });
        }
      }

      // upsert current selection
      if (desiredPayload.items.length) {
        await api.post(`/cases/${savedCaseId}/line-items`, desiredPayload, { headers: authHeaders });
      }

      setSuccess(isUpdate ? "💾 Case updated successfully!" : "✅ Case created successfully!");
      navigate("/admin/view-cases");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err?.response?.data?.error || err?.message || "❌ Failed to submit form.");
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
            <div className="bg-green-50 border border-green-400 text-green-700 p-3 rounded">{success}</div>
          )}
          {error && <div className="bg-red-50 border border-red-400 text-red-700 p-3 rounded">{error}</div>}

          <form onSubmit={handleSubmit} noValidate className="space-y-10">
            {/* Client Info */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">👤 Client Details</h2>

              {/* client_id */}
              {!isUpdate ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700 mb-1 block">
                      Client ID (numeric) <span className="text-red-600">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={idFromKey("client_id")}
                        type="number"
                        min="1"
                        name="client_id"
                        value={formData.client_id}
                        onChange={handleClientIdChange}
                        placeholder="Enter Client ID (e.g., 1,2,3...)"
                        className={fieldCls("client_id")}
                      />
                      <button
                        type="button"
                        onClick={verifyClientId}
                        className="whitespace-nowrap px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                      >
                        Verify
                      </button>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      {clientIdStatus.state === "checking" && <span className="text-sm text-gray-600">Checking…</span>}
                      {clientIdStatus.state === "available" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Available
                        </span>
                      )}
                      {clientIdStatus.state === "unavailable" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                          Already used
                        </span>
                      )}
                      {(clientIdStatus.state === "invalid" || clientIdStatus.state === "error") && (
                        <span className="text-xs text-rose-600">{clientIdStatus.msg}</span>
                      )}
                    </div>

                    {clientIdStatus.state === "unavailable" && clientIdStatus.data ? (
                      <div className="mt-2 text-xs text-gray-600">
                        Exists: <b>{clientIdStatus.data.patient_name || "—"}</b> ·{" "}
                        <code className="bg-gray-100 px-1 rounded">{clientIdStatus.data.case_uid || "—"}</code>
                      </div>
                    ) : null}

                    <ErrorText msg={errors["client_id"]} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700 mb-1 block">Client ID</label>
                    <input
                      id={idFromKey("client_id")}
                      type="text"
                      value={String(formData.client_id ?? "")}
                      readOnly
                      disabled
                      className={`${baseInputCls} ${normalBorder} bg-gray-100`}
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

            {/* Conditions */}
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

            {/* Therapy Plan Builder -> CASE ITEMS */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">🧾 Case Items (Therapies / Tests)</h2>
              <p className="text-sm text-gray-600">
                Ye selection ab <b>CaseItem</b> me save hoti hai. Create/Update ke baad items auto upsert hota hai.
              </p>

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
                              <th className="py-2 pr-4">Sessions Qty</th>
                              <th className="py-2 pr-4">Discount (%)</th>
                              <th className="py-2 pr-4">Start Date</th>
                              <th className="py-2 pr-4">End Date</th>
                              <th className="py-2 pr-4">Details</th>
                              <th className="py-2 pr-4">Clear</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cat.subtherapies.map((s) => {
                              const sid = String(s._id);
                              const existing = blk.subTherapy.find((x) => String(x.subTherapyId) === sid);

                              const sessionsCount = existing?.sessions_count ?? "";
                              const discountPercent =
                                existing?.discount_percent ?? computeDiscountPercent(s.discountSlabs, Number(existing?.sessions_count || 0));

                              const startDateVal = existing?.start_date || todayISO();
                              const endDateVal = existing?.end_date || "";

                              const pricePerSessionVal = Number(s?.price_per_session ?? s?.pricePerSession ?? 0);
                              const durationMins = s?.duration_mins ?? s?.duration ?? null;

                              const tooltipContent = (
                                <div className="w-[320px]">
                                  <div className="text-sm font-semibold text-gray-900 mb-2">{s.name} — Details</div>
                                  <div className="text-xs text-gray-700 space-y-1">
                                    <div className="flex justify-between gap-3">
                                      <span>Per Session</span>
                                      <span className="font-medium">₹ {pricePerSessionVal}</span>
                                    </div>
                                    {!!durationMins && (
                                      <div className="flex justify-between gap-3">
                                        <span>Duration</span>
                                        <span className="font-medium">{durationMins} mins</span>
                                      </div>
                                    )}
                                    <div className="mt-2">
                                      <div className="text-[11px] text-gray-500 mb-1">Discount slabs</div>
                                      <div className="text-[12px] text-gray-800">{formatSlabs(s.discountSlabs)}</div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-[11px] text-gray-500">
                                    Tip: Sessions qty change → discount auto updates.
                                  </div>
                                </div>
                              );

                              return (
                                <tr key={sid} className="border-b last:border-b-0">
                                  <td className="py-2 pr-4">
                                    <div className="font-medium text-gray-900">{s.name}</div>
                                    {!!durationMins && <div className="text-xs text-gray-500">Duration: {durationMins} mins</div>}
                                  </td>

                                  <td className="py-2 pr-4">
                                    <input
                                      type="number"
                                      min={1}
                                      value={sessionsCount}
                                      onChange={(e) => setSubTherapySessionsCount(tid, sid, e.target.value, s)}
                                      className="border rounded px-2 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      placeholder="e.g. 5"
                                    />
                                  </td>

                                  <td className="py-2 pr-4">
                                    <input
                                      type="number"
                                      value={Number.isFinite(Number(discountPercent)) ? Number(discountPercent) : 0}
                                      readOnly
                                      disabled
                                      className="border rounded px-2 py-1 w-28 bg-gray-100 text-gray-700"
                                      title="Auto calculated from discount slabs"
                                    />
                                  </td>

                                  <td className="py-2 pr-4">
                                    <input
                                      type="date"
                                      value={startDateVal}
                                      disabled={!existing}
                                      onChange={(e) => setSubTherapyDate(tid, sid, "start_date", e.target.value)}
                                      className={`border rounded px-2 py-1 w-40 focus:outline-none ${
                                        existing ? "focus:ring-2 focus:ring-indigo-500" : "bg-gray-100 text-gray-500"
                                      }`}
                                    />
                                  </td>

                                  <td className="py-2 pr-4">
                                    <input
                                      type="date"
                                      value={endDateVal}
                                      disabled={!existing}
                                      onChange={(e) => setSubTherapyDate(tid, sid, "end_date", e.target.value)}
                                      className={`border rounded px-2 py-1 w-40 focus:outline-none ${
                                        existing ? "focus:ring-2 focus:ring-indigo-500" : "bg-gray-100 text-gray-500"
                                      }`}
                                    />
                                  </td>

                                  <td className="py-2 pr-4">
                                    <Tippy
                                      content={tooltipContent}
                                      theme="light-border"
                                      placement="right"
                                      interactive
                                      appendTo={() => document.body}
                                      maxWidth={360}
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
                                    {existing ? (
                                      <button
                                        type="button"
                                        onClick={() => clearSubTherapySelection(tid, sid)}
                                        className="text-xs px-2 py-1 rounded border border-rose-300 text-rose-700 hover:bg-rose-50"
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
