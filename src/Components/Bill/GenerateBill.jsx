// src/pages/GenerateBill.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";

const toInputDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(n || 0)
  );

const fmtMins = (n) => (Number.isFinite(Number(n)) ? `${Number(n)} min` : "—");

const calcRemaining = (b) => {
  if (!b) return 0;
  const total =
    typeof b?.total_amount === "number"
      ? Number(b.total_amount || 0)
      : Number(b?.summary?.grand_total || 0);
  const paid = Number(b?.paid_amount || 0);
  return Math.max(0, total - paid);
};

const isBillEditLocked = (b) => {
  if (!b) return false;
  const st = String(b?.payment_status || "").toLowerCase();
  // ✅ paid / partial -> no edit permission
  if (st === "paid" || st === "partial" || st === "partially_paid") return true;
  // ✅ safety: remaining 0 means fully paid
  if (calcRemaining(b) <= 0) return true;
  return false;
};

export default function GenerateBill() {
  const { caseId: caseIdFromRoute } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const prefilledCase = location?.state?.caseData || null;
  const existingBillFromState = location?.state?.existingBill || null;

  // ------- axios instance -------
  const api = useMemo(
    () =>
      axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
    []
  );

  // ------- case selection -------
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState(
    caseIdFromRoute || prefilledCase?._id || ""
  );

  // ✅ map: caseId -> { locked: boolean, status: string }
  const [caseLockMap, setCaseLockMap] = useState({});
  const [locksLoading, setLocksLoading] = useState(false);

  // Full case detail (to read therapy_plan)
  const [caseDetail, setCaseDetail] = useState(null);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);
  const [caseDetailError, setCaseDetailError] = useState("");

  // ------- existing bill (if any) -------
  const [existingBill, setExistingBill] = useState(existingBillFromState || null);
  const [billLoading, setBillLoading] = useState(false);

  // ------- form state -------
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState([]); // ✅ ONLY plan-derived items
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // UI toggles
  const [showPlanDetails, setShowPlanDetails] = useState(true);

  // ------- fetch cases (server-side search) -------
  const fetchCases = async (q = "") => {
    setCasesLoading(true);
    setCasesError("");
    try {
      const { data } = await api.get("/search-cases", {
        params: q ? { q } : undefined,
      });
      const list = Array.isArray(data) ? data : [];
      setCases(list);
      // ✅ after cases fetched, check which have PAID/PARTIAL bills (hide from selection)
      await hydrateCaseLocks(list);
    } catch (e) {
      console.error("Error fetching cases:", e);
      setCasesError("Failed to load cases.");
      setCases([]);
      setCaseLockMap({});
    } finally {
      setCasesLoading(false);
    }
  };

  // ✅ mark locked cases (paid/partial) so they won't appear in dropdown
  const hydrateCaseLocks = async (list) => {
    try {
      setLocksLoading(true);
      const next = {};

      // keep existing info (so dropdown doesn't flicker too much)
      for (const [k, v] of Object.entries(caseLockMap || {})) next[k] = v;

      // Only check current list items
      const checks = (list || []).map(async (c) => {
        const id = c?._id;
        if (!id) return;
        try {
          const { data } = await api.get(`/cases/${id}/bill`);
          if (data) {
            const locked = isBillEditLocked(data);
            next[id] = {
              locked,
              status: String(data?.payment_status || "").toLowerCase() || "unknown",
            };
          } else {
            next[id] = { locked: false, status: "none" };
          }
        } catch (e) {
          if (e?.response?.status === 404) {
            next[id] = { locked: false, status: "none" };
          } else {
            // if error, don't lock it by default
            next[id] = next[id] || { locked: false, status: "unknown" };
          }
        }
      });

      await Promise.allSettled(checks);
      setCaseLockMap(next);
    } finally {
      setLocksLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchCases("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // live search
  useEffect(() => {
    const t = setTimeout(() => fetchCases(caseSearch.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseSearch]);

  // ensure chosen case appears in dropdown (even if not in current search results)
  useEffect(() => {
    const ensureCasePresent = async () => {
      if (!selectedCaseId) return;
      const exists = cases.some((c) => c._id === selectedCaseId);
      if (!exists) {
        try {
          const { data } = await api.get(`/view-case/${selectedCaseId}`);
          if (data?._id) {
            setCases((prev) => [data, ...prev.filter((p) => p._id !== data._id)]);
            // also hydrate lock for this single case
            await hydrateCaseLocks([data]);
          }
        } catch {
          // ignore
        }
      }
    };
    ensureCasePresent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId, cases.length]);

  const selectedCaseBrief = useMemo(
    () => cases.find((c) => c._id === selectedCaseId) || prefilledCase || null,
    [cases, selectedCaseId, prefilledCase]
  );

  // ✅ cases shown in dropdown (hide locked paid/partial)
  const selectableCases = useMemo(() => {
    return (cases || []).filter((c) => !caseLockMap?.[c._id]?.locked);
  }, [cases, caseLockMap]);

  const selectedCaseIsLocked = useMemo(() => {
    if (!selectedCaseId) return false;
    return !!caseLockMap?.[selectedCaseId]?.locked;
  }, [selectedCaseId, caseLockMap]);

  // fetch full case detail (therapy_plan etc.)
  const fetchCaseDetail = async (cid) => {
    if (!cid) return;
    setCaseDetailLoading(true);
    setCaseDetailError("");
    try {
      const { data } = await api.get(`/view-case/${cid}`);
      setCaseDetail(data || null);
    } catch (e) {
      console.error("Error fetching full case detail:", e);
      setCaseDetailError(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to load case detail."
      );
      setCaseDetail(null);
    } finally {
      setCaseDetailLoading(false);
    }
  };

  // ------- prefill from existing bill (if any) -------
  const fetchExistingBill = async (cid) => {
    if (!cid) return;
    setBillLoading(true);
    setExistingBill(null);
    try {
      const { data } = await api.get(`/cases/${cid}/bill`);
      setExistingBill(data || null);

      if (data) {
        setBillDate(toInputDate(data.bill_date) || billDate);
        setDueDate(toInputDate(data.due_date) || "");
        setTaxPercent(Number(data.summary?.tax_percent || 0));
        setDiscountPercent(Number(data.summary?.discount_percent || 0));
        setNotes(data.notes || "");

        const li = Array.isArray(data.line_items) ? data.line_items : [];
        setItems(
          li.map((x) => ({
            description: x.description || "",
            quantity: Number(x.quantity || 1),
            rate: Number(x.rate || 0),
          }))
        );
      }
    } catch (e) {
      if (e?.response?.status === 404) {
        setExistingBill(null); // no bill yet
      } else {
        console.error("Error fetching case bill:", e);
      }
    } finally {
      setBillLoading(false);
    }
  };

  // when case changes, load full detail + existing bill
  useEffect(() => {
    if (!selectedCaseId) return;
    fetchCaseDetail(selectedCaseId);
    fetchExistingBill(selectedCaseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  // ✅ lock editing for paid/partial bills
  const billEditLocked = useMemo(() => isBillEditLocked(existingBill), [existingBill]);

  // ------- items helpers (edit only) -------
  const updateItem = (idx, key, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  // ------- derive line-items from therapy_plan snapshot -------
  const buildItemsFromPlan = (planBlocks) => {
    const out = [];
    if (!Array.isArray(planBlocks)) return out;

    for (const blk of planBlocks) {
      const tName = blk?.therapy_name || "Therapy";
      const subs = Array.isArray(blk?.subTherapy) ? blk.subTherapy : [];
      const tests = Array.isArray(blk?.tests) ? blk.tests : [];

      // Sub-therapies
      for (const s of subs) {
        const sName = s?.name || "Sub-therapy";
        const hasPerSession = !!s?.flags?.pricePerSession;
        const hasPerPackage = !!s?.flags?.pricePerPackage;

        if (hasPerSession) {
          out.push({
            description: `${tName} • ${sName} (per session)`,
            quantity: 1,
            rate: Number(s?.price_per_session || 0),
          });
        }
        if (hasPerPackage) {
          out.push({
            description: `${tName} • ${sName} (package)`,
            quantity: 1,
            rate: Number(s?.price_per_package || 0),
          });
        }
      }

      // Tests
      if (blk?.therapyTestsEnabled) {
        for (const tt of tests) {
          const testName = tt?.name || "Test";
          out.push({
            description: `${tName} • ${testName} (test)`,
            quantity: 1,
            rate: Number(tt?.price_per_test || 0),
          });
        }
      }
    }

    return out;
  };

  // ✅ AUTO fill items from plan when case selected (only if no existing bill)
  useEffect(() => {
    if (!caseDetail?.therapy_plan?.length) return;
    if (existingBill) return; // existing bill ko override mat karo

    const derived = buildItemsFromPlan(caseDetail.therapy_plan);
    setItems(derived);
  }, [caseDetail, existingBill]);

  // totals
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
        0
      ),
    [items]
  );

  const taxAmount = useMemo(
    () => (subtotal * (Number(taxPercent) || 0)) / 100,
    [subtotal, taxPercent]
  );

  const discountAmount = useMemo(
    () => (subtotal * (Number(discountPercent) || 0)) / 100,
    [subtotal, discountPercent]
  );

  const grandTotal = useMemo(
    () => Math.max(0, subtotal + taxAmount - discountAmount),
    [subtotal, taxAmount, discountAmount]
  );

  // ------- submit -> PUT /cases/:caseId/bill -------
  const submitBill = async () => {
    setErrorMsg("");

    if (!selectedCaseId) return setErrorMsg("Please select a case.");
    if (selectedCaseIsLocked) {
      return setErrorMsg("This case bill is Paid/Partial — bill editing is not allowed.");
    }
    if (billEditLocked) {
      return setErrorMsg("This bill is Paid/Partial — you don't have permission to edit it.");
    }

    if (!billDate) return setErrorMsg("Bill date is required.");

    if (!Array.isArray(items) || items.length === 0) {
      return setErrorMsg(
        "No billable items found. Please ensure sub-therapies/tests are selected in the case plan."
      );
    }

    const invalidItem = items.some(
      (it) => !it.description || Number(it.quantity) <= 0 || Number(it.rate) < 0
    );
    if (invalidItem) {
      return setErrorMsg(
        "Each item needs a description, quantity > 0, and a non-negative rate."
      );
    }

    const allItems = items.map((i) => ({
      description: String(i.description || "").trim(),
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      amount: Number(i.quantity) * Number(i.rate),
    }));

    const payload = {
      bill_date: billDate,
      due_date: dueDate || null,
      items: allItems,
      summary: {
        tax_percent: Number(taxPercent) || 0,
        discount_percent: Number(discountPercent) || 0,
      },
      notes: notes || "",
    };

    try {
      setSaving(true);
      const { data } = await api.put(`/cases/${selectedCaseId}/bill`, payload);
      const updated = data?.updated;
      alert(updated ? "✅ Bill updated successfully." : "✅ Bill created successfully.");
      navigate(`/admin/case-details/${selectedCaseId}`);
    } catch (err) {
      console.error("Error saving bill:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "❌ Failed to save bill. Please try again.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // ------- UI -------
  const PlanBlock = ({ blk }) => {
    const subs = Array.isArray(blk?.subTherapy) ? blk.subTherapy : [];
    const tests = Array.isArray(blk?.tests) ? blk.tests : [];
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm border-indigo-100">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-semibold text-indigo-700 text-lg">
            {blk?.therapy_name || "Therapy"}
          </div>
          <div className="text-xs text-gray-600 flex gap-2">
            <span>Snapshot: {toInputDate(blk?.snapshot_at) || "—"}</span>
            <span>•</span>
            <span>Updated: {toInputDate(blk?.updatedAt) || "—"}</span>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Sub-Therapies</p>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Duration</th>
                  <th className="py-2 pr-4">Price / Session</th>
                  <th className="py-2 pr-4">Price / Package</th>
                  <th className="py-2 pr-4">Per Session?</th>
                  <th className="py-2 pr-4">Per Package?</th>
                </tr>
              </thead>
              <tbody>
                {subs.length ? (
                  subs.map((s, i) => {
                    const perPkg = !!s?.flags?.pricePerPackage;
                    return (
                      <tr
                        key={`${s?.subTherapyId || i}`}
                        className="border-b last:border-b-0"
                      >
                        <td className="py-2 pr-4">{s?.name || "—"}</td>
                        <td className="py-2 pr-4">{fmtMins(s?.duration_mins)}</td>
                        <td className="py-2 pr-4">{inr(s?.price_per_session)}</td>
                        <td className="py-2 pr-4">
                          {perPkg ? inr(s?.price_per_package) : "N/A"}
                        </td>
                        <td className="py-2 pr-4">
                          {s?.flags?.pricePerSession ? (
                            <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {perPkg ? (
                            <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                              No
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={6}>
                      No sub-therapies selected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">Tests</p>
            <span
              className={`text-xs px-2 py-1 rounded ${
                blk?.therapyTestsEnabled
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {blk?.therapyTestsEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          {blk?.therapyTestsEnabled ? (
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Duration</th>
                    <th className="py-2 pr-4">Price / Test</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.length ? (
                    tests.map((t, i) => (
                      <tr
                        key={`${t?.testId || i}`}
                        className="border-b last:border-b-0"
                      >
                        <td className="py-2 pr-4">{t?.name || "—"}</td>
                        <td className="py-2 pr-4">{fmtMins(t?.duration_mins)}</td>
                        <td className="py-2 pr-4">{inr(t?.price_per_test)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={3}>
                        Tests are enabled, but none were selected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-500 mt-1">Tests not enabled for this therapy.</div>
          )}
        </div>
      </div>
    );
  };

  const disableAllEdits = billEditLocked || selectedCaseIsLocked;

  return (
    <div className="min-h-screen w-full py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur shadow-2xl rounded-xl p-6 sm:p-8 border border-indigo-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-3xl font-bold text-indigo-700">
            🧾 {existingBill ? "Update Bill" : "Generate Bill"}
          </h2>
          <div className="text-sm text-gray-500">
            {selectedCaseId ? (
              <span>
                For{" "}
                <span className="font-semibold text-gray-700">
                  {caseDetail?.patient_name ||
                    selectedCaseBrief?.patient_name ||
                    selectedCaseBrief?.p_id}
                </span>{" "}
                (Case #{selectedCaseId})
              </span>
            ) : (
              <span>Select a case</span>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {errorMsg}
          </div>
        )}

        {selectedCaseIsLocked && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
            Paid/Partial bill case selected — bill editing not allowed. Please select another case.
          </div>
        )}

        {billEditLocked && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
            This bill is Paid/Partial — you don&apos;t have permission to edit it.
          </div>
        )}

        {/* Case selection + bill meta */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Case selection */}
          <div className="lg:col-span-1 bg-gray-50 border rounded-xl p-4">
            <label className="text-sm text-gray-600 mb-2 block">Select Case</label>

            <input
              type="text"
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
              placeholder="Search by name, phone, or type..."
              className="w-full mb-2 rounded-md border p-2"
            />

            <select
              disabled={casesLoading || !!casesError}
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full rounded-md border p-2"
            >
              <option value="" disabled>
                {casesLoading ? "Loading cases..." : "Choose a case"}
              </option>

              {/* If a locked case is opened directly via URL, show it but disabled */}
              {selectedCaseId && caseLockMap?.[selectedCaseId]?.locked && (
                <option value={selectedCaseId} disabled>
                  (Locked: Paid/Partial) • {selectedCaseBrief?.patient_name || "Selected Case"}
                </option>
              )}

              {selectableCases.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.patient_name} • {c.p_id || "—"}
                </option>
              ))}
            </select>

            <div className="mt-3 text-xs text-gray-500">
              ✅ Paid/Partial bill cases are hidden from selection.
              {locksLoading ? (
                <span className="ml-2 text-[11px] text-gray-400">Checking bills…</span>
              ) : null}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Items are auto-generated from this case&apos;s Therapy Plan snapshot.
            </div>

            {selectedCaseId && (
              <p className="text-xs mt-2">
                <Link
                  to={`/admin/case-details/${selectedCaseId}`}
                  className="text-indigo-600 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View Case Details
                </Link>
              </p>
            )}
          </div>

          {/* Bill & Due dates + totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-2">
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Bill Date</label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="rounded-lg border p-2"
                disabled={disableAllEdits}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Due Date (optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border p-2"
                disabled={disableAllEdits}
              />
            </div>

            <div className="md:col-span-2 bg-gray-50 border rounded-xl p-4">
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="text-gray-600 flex items-center gap-2">
                  Tax (%)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className="w-24 rounded-md border p-1"
                    disabled={disableAllEdits}
                  />
                </label>
                <span className="font-semibold">₹ {taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="text-gray-600 flex items-center gap-2">
                  Discount (%)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-24 rounded-md border p-1"
                    disabled={disableAllEdits}
                  />
                </label>
                <span className="font-semibold">- ₹ {discountAmount.toFixed(2)}</span>
              </div>

              <div className="h-px bg-gray-200 my-2" />

              <div className="flex items-center justify-between py-1 text-lg">
                <span className="font-semibold text-gray-800">Grand Total</span>
                <span className="font-bold text-indigo-700">₹ {grandTotal.toFixed(2)}</span>
              </div>

              {existingBill && (
                <p className="text-xs text-amber-700 mt-2">
                  Note: If payments already exist on this bill, the server will block lowering the
                  total below the amount already paid.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ======= Generated Bill Items (editable qty/rate) ======= */}
        {/* <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">
              Bill Items (from Therapy Plan)
            </h3>
            <span className="text-xs text-gray-500">
              Qty/Rate editable • No manual add/remove
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Rate (₹)</th>
                  <th className="py-2 pr-3">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const amount = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
                  return (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                          className="w-full rounded-md border p-2"
                          disabled={disableAllEdits}
                        />
                      </td>

                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                          className="w-24 rounded-md border p-2"
                          disabled={disableAllEdits}
                        />
                      </td>

                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.rate}
                          onChange={(e) => updateItem(idx, "rate", e.target.value)}
                          className="w-28 rounded-md border p-2"
                          disabled={disableAllEdits}
                        />
                      </td>

                      <td className="py-2 pr-3">
                        <div className="w-28 rounded-md border p-2 bg-gray-50">
                          {amount.toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={4}>
                      No items found from plan. Please check the case plan selections.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div> */}

        {/* ======= Plan Snapshot (read-only helper) ======= */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-indigo-800">Therapy Plan Snapshot</h3>
            <button
              type="button"
              onClick={() => setShowPlanDetails((v) => !v)}
              className="text-sm text-indigo-600 underline"
            >
              {showPlanDetails ? "Hide" : "Show"}
            </button>
          </div>

          {caseDetailLoading ? (
            <div className="text-gray-600 mt-2">Loading plan…</div>
          ) : caseDetailError ? (
            <div className="text-red-600 mt-2">{caseDetailError}</div>
          ) : !caseDetail?.therapy_plan?.length ? (
            <div className="text-gray-600 mt-2">No plan snapshot on this case.</div>
          ) : showPlanDetails ? (
            <div className="space-y-4 mt-3">
              {caseDetail.therapy_plan.map((blk, i) => (
                <PlanBlock key={`${blk?.therapyId || i}`} blk={blk} />
              ))}
            </div>
          ) : null}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="text-sm text-gray-600 mb-1 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add payment terms, additional info, etc."
            className="w-full rounded-lg border p-3"
            disabled={disableAllEdits}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <button
            type="button"
            disabled={saving || billLoading || disableAllEdits}
            onClick={submitBill}
            className={`px-5 py-2 rounded-lg shadow text-white ${
              saving || billLoading || disableAllEdits
                ? "bg-gray-400"
                : "bg-green-600 hover:bg-green-700"
            }`}
            title={
              disableAllEdits
                ? "Paid/Partial bill cases are not editable"
                : existingBill
                ? "Update Bill"
                : "Generate Bill"
            }
          >
            {saving ? "Saving..." : existingBill ? "Update Bill" : "Generate Bill"}
          </button>
        </div>
      </div>
    </div>
  );
}
