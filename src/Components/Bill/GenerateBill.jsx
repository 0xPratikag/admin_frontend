// src/pages/billing/GenerateBill.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import { buildAxios, clamp, inr, makeKey, round2, toNum } from "./_billingUtils";

import useBillingData from "./hooks/useBillingData";
import { resolvePricing, resolveQtyFromOverrides } from "./billingHelpers";
import { makeRowId, stablePlanRowId } from "./hooks/useBillingStorage";

import ItemsTable from "./ItemsTable";
import AddItemsModal from "./AddItemsModal";

// =====================
// ROUTES
// =====================
const ROUTE_ALL_INVOICES = (caseId) => `/admin/case-invoices/${caseId}`;

const emptyDraft = {
  selectedRowIds: [],
  overrides: {},
  customAdds: [],
  hiddenBaseKeys: [],
};

export default function GenerateBill() {
  const { caseId: caseIdFromRoute } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledCase = location?.state?.caseData || null;

  const api = useMemo(() => axios.create(buildAxios()), []);

  const {
    cases,
    casesLoading,
    casesError,
    fetchCases,

    caseDetail,
    caseDetailLoading,
    caseDetailError,
    fetchCaseDetail,

    invoices,
    invoicesLoading,
    fetchInvoices,

    billedMap,
    hydrateBilledMap,

    therapyList,
    therapyLoading,
    fetchTherapies,

    catalogs,
    catalogLoading,
    loadCatalogForTherapy,
  } = useBillingData(api);

  // UI state
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState(caseIdFromRoute || prefilledCase?._id || "");

  const selectedCaseBrief = useMemo(
    () => cases.find((c) => c._id === selectedCaseId) || prefilledCase || null,
    [cases, selectedCaseId, prefilledCase]
  );

  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // selection (row-based)
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [overrides, setOverrides] = useState({}); // rowId -> { qty }

  // custom rows
  const [customAdds, setCustomAdds] = useState([]);

  // hidden plan items (baseKey)
  const [hiddenBaseKeys, setHiddenBaseKeys] = useState([]);

  // add modal
  const [addOpen, setAddOpen] = useState(false);

  // draft state flags
  const draftLoadedRef = useRef(false);
  const savingDraftRef = useRef(false);

  // =====================
  // Init
  // =====================
  useEffect(() => {
    fetchCases("");
    fetchTherapies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchCases(caseSearch.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseSearch]);

  // =====================
  // Load case + draft (server)
  // =====================
  useEffect(() => {
    let alive = true;
    async function boot() {
      if (!selectedCaseId) return;

      setErrorMsg("");
      draftLoadedRef.current = false;

      // load case + invoices
      fetchCaseDetail(selectedCaseId);
      fetchInvoices(selectedCaseId);

      // billed map from invoices
      hydrateBilledMap(selectedCaseId, (x) => makeKey(x));

      // load draft
      try {
        const { data } = await api.get(`/cases/${selectedCaseId}/billing-draft`);
        const d = data?.draft || data; // support both shapes

        if (!alive) return;

        setSelectedRowIds(Array.isArray(d?.selectedRowIds) ? d.selectedRowIds : []);
        setOverrides(d?.overrides && typeof d.overrides === "object" ? d.overrides : {});
        setCustomAdds(Array.isArray(d?.customAdds) ? d.customAdds : []);
        setHiddenBaseKeys(Array.isArray(d?.hiddenBaseKeys) ? d.hiddenBaseKeys : []);
      } catch (e) {
        // if no draft found -> empty
        if (!alive) return;
        setSelectedRowIds([]);
        setOverrides({});
        setCustomAdds([]);
        setHiddenBaseKeys([]);
      } finally {
        if (!alive) return;
        draftLoadedRef.current = true;
      }
    }

    boot();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  // =====================
  // Autosave draft (debounced)
  // =====================
  useEffect(() => {
    if (!selectedCaseId) return;
    if (!draftLoadedRef.current) return;

    const t = setTimeout(async () => {
      if (savingDraftRef.current) return;
      savingDraftRef.current = true;

      try {
        await api.put(`/cases/${selectedCaseId}/billing-draft`, {
          selectedRowIds,
          overrides,
          customAdds,
          hiddenBaseKeys,
          clientUpdatedAt: new Date().toISOString(),
        });
      } catch (e) {
        // silent (avoid annoying UI spam)
        console.error("draft save failed", e);
      } finally {
        savingDraftRef.current = false;
      }
    }, 500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId, selectedRowIds, overrides, customAdds, hiddenBaseKeys]);

  // pre-load catalogs for therapy_plan therapies
  useEffect(() => {
    const blocks = caseDetail?.therapy_plan;
    if (!Array.isArray(blocks) || !blocks.length) return;

    const ids = Array.from(new Set(blocks.map((b) => String(b?.therapyId || "")).filter(Boolean)));
    ids.forEach((tid) => loadCatalogForTherapy(tid));
  }, [caseDetail, loadCatalogForTherapy]);

  // =====================
  // Helpers
  // =====================
  const therapyNameById = useMemo(() => {
    const m = {};
    for (const t of therapyList || []) m[String(t._id)] = t.name;
    return m;
  }, [therapyList]);

  // plan items
  const planItems = useMemo(() => {
    const out = [];
    const blocks = caseDetail?.therapy_plan;
    if (!Array.isArray(blocks)) return out;

    for (const blk of blocks) {
      const therapyId = String(blk?.therapyId || "");
      if (!therapyId) continue;

      const therapyName = therapyNameById[therapyId] || blk?.therapy_name || "Therapy";
      const cat = catalogs[therapyId] || { subtherapies: [], tests: [] };

      const subById = Object.fromEntries((cat.subtherapies || []).map((s) => [String(s._id), s]));
      const testById = Object.fromEntries((cat.tests || []).map((t) => [String(t._id), t]));

      // subs
      const subs = Array.isArray(blk?.subTherapy) ? blk.subTherapy : [];
      for (const row of subs) {
        const subTherapyId = String(row?.subTherapyId || "");
        if (!subTherapyId) continue;

        const qty = clamp(toNum(row?.sessions_count, 1), 1, 999999);

        const subDoc = subById[subTherapyId];
        const subName = subDoc?.name || row?.name || "Sub-therapy";
        const basePrice = toNum(
          subDoc?.price_per_session ?? subDoc?.pricePerSession ?? row?.price_per_session,
          0
        );

        const baseKey = makeKey({ type: "THERAPY", itemId: therapyId, subItemId: subTherapyId });

        out.push({
          source: "PLAN",
          type: "THERAPY",
          itemId: therapyId,
          subItemId: subTherapyId,
          baseKey,
          rowId: stablePlanRowId(baseKey),
          displayName: `${therapyName} • ${subName}`,
          qty,
          meta: {
            basePrice,
            slabs: subDoc?.discountSlabs || [],
            durationMins: subDoc?.duration_mins ?? subDoc?.duration ?? null,
          },
        });
      }

      // tests
      if (blk?.therapyTestsEnabled) {
        const tests = Array.isArray(blk?.tests) ? blk.tests : [];
        for (const t of tests) {
          const testId = String(t?.testId || "");
          if (!testId) continue;

          const testDoc = testById[testId];
          const name = testDoc?.name || t?.name || "Test";
          const basePrice = toNum(
            testDoc?.price_per_test ?? testDoc?.pricePerTest ?? t?.price_per_test,
            0
          );

          const baseKey = makeKey({ type: "TEST", itemId: testId, subItemId: null });

          out.push({
            source: "PLAN",
            type: "TEST",
            itemId: testId,
            subItemId: null,
            baseKey,
            rowId: stablePlanRowId(baseKey),
            displayName: `${name} • (${therapyName})`,
            qty: 1,
            meta: { basePrice, slabs: [] },
          });
        }
      }
    }

    return out;
  }, [caseDetail, catalogs, therapyNameById]);

  // all rows (filter hidden PLAN)
  const allSelectableItems = useMemo(() => {
    const hiddenSet = new Set(hiddenBaseKeys || []);
    const visiblePlan = (planItems || []).filter((x) => !hiddenSet.has(x.baseKey));

    const fixedCustom = (customAdds || []).map((x) => ({
      ...x,
      rowId: x.rowId || makeRowId("c"),
    }));

    return [...visiblePlan, ...fixedCustom];
  }, [planItems, customAdds, hiddenBaseKeys]);

  // selected rows resolved
  const selectedItemsResolved = useMemo(() => {
    const set = new Set(selectedRowIds);
    const out = [];
    for (const it of allSelectableItems) {
      if (!set.has(it.rowId)) continue;
      const qty = resolveQtyFromOverrides(it.rowId, it, overrides);
      const pricing = resolvePricing(it, qty);
      out.push({ ...it, qty, ...pricing });
    }
    return out;
  }, [allSelectableItems, selectedRowIds, overrides]);

  const summary = useMemo(() => {
    const totalBase = selectedItemsResolved.reduce((s, it) => s + (it.rowBase || 0), 0);
    const totalDiscount = selectedItemsResolved.reduce((s, it) => s + (it.rowDiscount || 0), 0);
    const totalNet = selectedItemsResolved.reduce((s, it) => s + (it.rowTotal || 0), 0);
    return {
      totalBase: round2(totalBase),
      totalDiscount: round2(totalDiscount),
      totalNet: round2(totalNet),
    };
  }, [selectedItemsResolved]);

  // =====================
  // Selection actions
  // =====================
  const toggleRow = (rowId) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((x) => x !== rowId) : [...prev, rowId]
    );
  };

  const selectAll = () => setSelectedRowIds(allSelectableItems.map((x) => x.rowId));
  const clearAll = () => setSelectedRowIds([]);

  const onQtyChange = (rowId, raw) => {
    setOverrides((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), qty: raw },
    }));
  };

  // =====================
  // Duplicate row
  // =====================
  const duplicateRow = (it) => {
    const newRow = {
      ...it,
      source: "CUSTOM_DUP",
      rowId: makeRowId("c"),
      baseKey: it.baseKey || makeKey({ type: it.type, itemId: it.itemId, subItemId: it.subItemId }),
    };

    setCustomAdds((prev) => [...(prev || []), newRow]);
    setSelectedRowIds((prev) => [...prev, newRow.rowId]);

    const currentQty = resolveQtyFromOverrides(it.rowId, it, overrides);
    setOverrides((prev) => ({ ...prev, [newRow.rowId]: { qty: String(currentQty) } }));
  };

  // Remove row (PLAN hide + CUSTOM delete) only if never billed
  const removeRow = (it) => {
    if (!it) return;

    const billed = billedMap?.[it.baseKey];
    if (billed?.count) {
      setErrorMsg("❌ Ye item pehle kisi bill me ja chuka hai, isliye remove allowed nahi.");
      return;
    }

    const isCustom =
      it.source === "CUSTOM" || it.source === "CUSTOM_DUP" || it.source === "INVOICE_CLONE";

    if (isCustom) {
      setCustomAdds((prev) => (prev || []).filter((x) => x.rowId !== it.rowId));
    } else {
      setHiddenBaseKeys((prev) => Array.from(new Set([...(prev || []), it.baseKey])));
    }

    setSelectedRowIds((prev) => prev.filter((k) => k !== it.rowId));
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[it.rowId];
      return next;
    });
  };

  // =====================
  // Add modal helpers
  // =====================
  const openAddModal = async () => {
    setAddOpen(true);
    try {
      await fetchTherapies();
    } catch {}
  };

  const makeRowFromCatalog = ({ therapyId, kind, doc, qty }) => {
    const tid = String(therapyId);
    const tDoc = (therapyList || []).find((t) => String(t._id) === tid);
    const therapyName = tDoc?.name || "Therapy";

    if (kind === "SUB") {
      const sid = String(doc._id);
      const baseKey = makeKey({ type: "THERAPY", itemId: tid, subItemId: sid });
      const basePrice = toNum(doc?.price_per_session ?? doc?.pricePerSession, 0);

      return {
        source: "CUSTOM",
        type: "THERAPY",
        itemId: tid,
        subItemId: sid,
        baseKey,
        rowId: makeRowId("c"),
        displayName: `${therapyName} • ${doc?.name || "Sub-therapy"}`,
        qty,
        meta: {
          basePrice,
          slabs: doc?.discountSlabs || [],
          durationMins: doc?.duration_mins ?? doc?.duration ?? null,
        },
      };
    }

 // TEST row
const xid = String(doc._id);
const baseKey = makeKey({ type: "TEST", itemId: xid, subItemId: null });
const basePrice = toNum(doc?.price_per_test ?? doc?.pricePerTest, 0);

return {
  source: "CUSTOM",
  type: "TEST",
  itemId: xid,
  subItemId: null,
  baseKey,
  rowId: makeRowId("c"),
  displayName: `${doc?.name || "Test"} • (${therapyName})`,
  qty: 1,
  meta: { basePrice, slabs: [], therapyId: tid }, // ✅ ADD therapyId here
};

  };

  const makeNewCustomRows = (rows) => {
    setCustomAdds((prev) => [...(prev || []), ...(rows || [])]);
    setSelectedRowIds((prev) => [...prev, ...(rows || []).map((r) => r.rowId)]);
    setOverrides((prev) => {
      const next = { ...prev };
      for (const r of rows || []) next[r.rowId] = { qty: String(r.qty) };
      return next;
    });
  };

  // =====================
  // Reuse selection from invoice (clone as new rows)
  // =====================
  const useFromInvoice = async (invoiceId) => {
    if (!invoiceId) return;
    try {
      const { data } = await api.get(`/invoices/${invoiceId}`);
      const items = Array.isArray(data?.current?.items) ? data.current.items : [];

      const newRows = [];
      for (const it of items) {
        const baseKey = makeKey({ type: it.type, itemId: it.itemId, subItemId: it.subItemId });
        const template = allSelectableItems.find((x) => x.baseKey === baseKey) || null;

        const rowId = makeRowId("c");
        newRows.push({
          source: "INVOICE_CLONE",
          type: it.type,
          itemId: it.itemId,
          subItemId: it.subItemId || null,
          baseKey,
          rowId,
          displayName: template?.displayName || it?.name || "Item",
          qty: clamp(toNum(it.qty, 1), 1, 999999),
          meta: template?.meta || { basePrice: toNum(it.basePrice ?? it.unitPrice, 0), slabs: [] },
        });
      }

      if (newRows.length) makeNewCustomRows(newRows);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load invoice items for selection.");
    }
  };

  // =====================
  // Generate invoice (DIRECT)
  // =====================
  const generateInvoice = async () => {
    setErrorMsg("");
    if (!selectedCaseId) return setErrorMsg("Please select a case.");
    if (!selectedItemsResolved.length) return setErrorMsg("Please tick at least 1 item.");

    try {
      setSaving(true);

      const itemsPayload = selectedItemsResolved.map((it) => ({
        type: it.type,
        itemId: it.itemId,
        subItemId: it.subItemId || null,
        name: it.displayName,
        qty: it.qty,
        unitPrice: it.unitNet,
        discountPercent: it.discountPct,
        basePrice: it.basePrice,
        clientRowId: it.rowId,
        baseKey: it.baseKey,

        
  // ✅ important for TEST item_code
  therapyId: it.type === "TEST" ? it?.meta?.therapyId : undefined,
      }));

      const res = await api.post(`/cases/${selectedCaseId}/invoices`, {
        taxRate: 0,
        items: itemsPayload,
        summary: { ...summary, currency: "INR" },
      });

      const data = res.data;
      const invoiceId = data?.invoiceId || data?._id;

      // refresh invoices + billedMap
      await fetchInvoices(selectedCaseId);
      await hydrateBilledMap(selectedCaseId, (x) => makeKey(x));

      // ✅ clear draft after success (so old selections don't stick)
      try {
        await api.delete(`/cases/${selectedCaseId}/billing-draft`);
      } catch {}

      // reset UI draft state (optional)
      setSelectedRowIds([]);
      setOverrides({});
      setCustomAdds([]);
      setHiddenBaseKeys([]);

      if (invoiceId) {
        navigate(`/admin/bill-details/${invoiceId}`, { state: { caseId: selectedCaseId } });
      } else {
        alert("✅ Invoice generated.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.response?.data?.message || "❌ Failed to generate invoice.");
    } finally {
      setSaving(false);
    }
  };

  // =====================
  // UI
  // =====================
  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-10 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Generate Bill / Create Invoice
          </h1>
          <div className="mt-2 text-sm text-slate-500">Direct Generate ✅ (Draft saved on server)</div>
        </div>

        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMsg}
          </div>
        ) : null}

        {/* Controls */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-sm font-semibold text-slate-700 min-w-[92px]">Select Case</div>

                <div className="flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={caseSearch}
                    onChange={(e) => setCaseSearch(e.target.value)}
                    placeholder="Search by patient name, phone..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="flex-1 min-w-[260px]">
                  <select
                    disabled={casesLoading || !!casesError}
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="" disabled>
                      {casesLoading ? "Loading cases..." : "Choose a case"}
                    </option>
                    {cases.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.patient_name} • {c.p_id || "—"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {casesError ? <div className="mt-2 text-xs text-red-600">{casesError}</div> : null}

              {selectedCaseId ? (
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                  <span>
                    Patient:{" "}
                    <span className="font-semibold text-slate-800">
                      {caseDetail?.patient_name ||
                        selectedCaseBrief?.patient_name ||
                        selectedCaseBrief?.p_id ||
                        "—"}
                    </span>
                  </span>

                  <Link
                    to={`/admin/case-details/${selectedCaseId}`}
                    className="text-indigo-600 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Case Details
                  </Link>

                  <span className="text-slate-300">|</span>

                  <select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                    disabled={!invoices?.length}
                    onChange={(e) => useFromInvoice(e.target.value)}
                    defaultValue=""
                    title="Reuse from invoice (creates NEW rows)"
                  >
                    <option value="" disabled>
                      Reuse from invoice…
                    </option>
                    {(invoices || []).map((inv) => (
                      <option key={inv.invoiceId} value={inv.invoiceId}>
                        {inv.invoiceNumber} (v{inv.currentVersionNo})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={openAddModal}
                disabled={!selectedCaseId}
                className={`px-5 py-3 rounded-xl border font-semibold ${
                  selectedCaseId
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                Add
              </button>

              <button
                type="button"
                onClick={() => selectedCaseId && navigate(ROUTE_ALL_INVOICES(selectedCaseId))}
                disabled={!selectedCaseId}
                className={`px-5 py-3 rounded-xl border font-semibold ${
                  selectedCaseId
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                All Invoices
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gradient-to-r from-white to-slate-50 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold text-slate-900">Items for selected case</div>
              <div className="text-xs text-slate-500">Remove allowed only if Not billed</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm"
                disabled={!allSelectableItems.length}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm"
                disabled={!selectedRowIds.length}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="px-5 py-3 text-xs text-slate-500">
            {caseDetailLoading ? "Loading case…" : caseDetailError ? caseDetailError : null}
            {invoicesLoading ? " • Loading invoices…" : null}
          </div>

          {!allSelectableItems.length ? (
            <div className="px-5 pb-6 text-slate-600">No items found.</div>
          ) : (
            <ItemsTable
              items={allSelectableItems}
              selectedRowIds={selectedRowIds}
              overrides={overrides}
              onToggleRow={toggleRow}
              onQtyChange={onQtyChange}
              billedMap={billedMap}
              onRemoveRow={removeRow}
              onDuplicateRow={duplicateRow}
            />
          )}
        </div>

        {/* Summary + Generate */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="font-bold text-slate-900 mb-3">Summary</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="text-xs text-slate-500">Selected Rows</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {selectedItemsResolved.length}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="text-xs text-slate-500">Total discount</div>
                <div className="text-2xl font-extrabold text-amber-700 mt-1">
                  {inr(summary.totalDiscount)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="text-xs text-slate-500">Total amount overall</div>
                <div className="text-2xl font-extrabold text-indigo-700 mt-1">
                  {inr(summary.totalNet)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col justify-between">
            <div className="text-sm text-slate-600">
              <div className="font-semibold text-slate-900 mb-1">Action</div>
              <div className="text-xs text-slate-500">Direct invoice create on Generate</div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={generateInvoice}
                disabled={saving || !selectedItemsResolved.length || !selectedCaseId}
                className={`w-full px-6 py-3 rounded-xl font-extrabold text-white shadow ${
                  saving || !selectedItemsResolved.length || !selectedCaseId
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                }`}
              >
                {saving ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Items Modal */}
      <AddItemsModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
  api={api}                     // ✅
  caseId={selectedCaseId}        // ✅
  onItemsAdded={async () => {    // ✅ refresh case
    await fetchCaseDetail(selectedCaseId);
    // (optional) plan me new therapy aaya to catalog pre-load will run via effect
  }}
        
        therapyList={therapyList}
        therapyLoading={therapyLoading}
        catalogs={catalogs}
        catalogLoading={catalogLoading}
        loadCatalogForTherapy={loadCatalogForTherapy}
        makeNewCustomRows={makeNewCustomRows}
        makeRowFromCatalog={makeRowFromCatalog}
      />
    </div>
  );
}
