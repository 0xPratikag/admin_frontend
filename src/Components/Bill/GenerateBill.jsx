import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import { buildAxios, clamp, inr, makeKey, round2, toNum } from "./_billingUtils";
import useBillingData from "./hooks/useBillingData";
import { resolvePricing, resolveQtyFromOverrides } from "./billingHelpers";

import ItemsTable from "./ItemsTable";
import AddItemsModal from "./AddItemsModal";

const ROUTE_ALL_INVOICES = (caseId) => `/admin/invoices?caseId=${caseId}`;
const findSubTherapyInCatalog = (cat, subId) => {
  const s = String(subId);
  const list =
    cat?.subtherapies ||        // ✅ ADD THIS (your actual key)
    cat?.subTherapies ||
    cat?.sub_therapies ||
    cat?.data?.subTherapies ||
    cat?.data?.subtherapies ||
    [];
  return list.find((x) => String(x._id || x.id) === s) || null;
};


const findTestInCatalog = (cat, testId) => {
  const t = String(testId);
  const list =
    cat?.tests ||
    cat?.testList ||
    cat?.data?.tests ||
    [];
  return list.find((x) => String(x._id || x.id) === t) || null;
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

    lineItems,
    lineItemsLoading,
    lineItemsError,
    fetchLineItems,

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

  // add modal
  const [addOpen, setAddOpen] = useState(false);


useEffect(() => {
  if (!lineItems?.length) return;

  const therapyIds = Array.from(
    new Set(lineItems.map((x) => String(x.therapyId)).filter(Boolean))
  );

  therapyIds.forEach((tid) => {
    if (!catalogs?.[tid]) loadCatalogForTherapy(tid);
  });
}, [lineItems, catalogs, loadCatalogForTherapy]);


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
  // When case changes → fetch everything fresh from API
  // =====================
  useEffect(() => {
    if (!selectedCaseId) return;

    setErrorMsg("");

    // reset selections when switching case
    setSelectedRowIds([]);
    setOverrides({});

    fetchCaseDetail(selectedCaseId);
    fetchLineItems(selectedCaseId, "active");
    fetchInvoices(selectedCaseId);
    hydrateBilledMap(selectedCaseId, (x) => makeKey(x));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  // =====================
  // Convert DB line-items -> selectable rows (ONLY API DATA)
  // =====================
const allSelectableItems = useMemo(() => {
  const out = [];

  for (const li of lineItems || []) {
    if (li.status && li.status !== "active") continue;

    // ✅ SUB
    if (li.item_type === "SUB") {
      const therapyId = String(li.therapyId);
      const subId = String(li.subTherapyId);

      const baseKey = makeKey({
        type: "THERAPY",
        itemId: therapyId,
        subItemId: subId,
      });

      const cat = catalogs?.[therapyId];
      const sub = findSubTherapyInCatalog(cat, subId);

      const slabs =
        sub?.discountSlabs ||  
        sub?.slabs ||
        sub?.pricing_slabs ||
        sub?.pricing?.slabs ||
        [];

      out.push({
        source: "DB",
        dbId: li._id,
        type: "THERAPY",
        itemId: therapyId,
        subItemId: subId,
        baseKey,
        rowId: `db_${li._id}`,
        displayName: `${li.therapy_name || "Therapy"} • ${li.name || "Sub-therapy"}`,
        qty: clamp(toNum(li.sessions_count, 1), 1, 999999),
        meta: {
          basePrice: toNum(li.price_per_session, 0),
          slabs, // ✅ slabs attached
          durationMins: li.duration_mins ?? null,
        },
        // optional: if backend sends these, keep them for remove/lock logic
        invoiced_count: li.invoiced_count,
        last_invoice_id: li.last_invoice_id,
      });
    }

    // ✅ TEST
    if (li.item_type === "TEST") {
      const therapyId = String(li.therapyId);
      const testId = String(li.testId);

      const baseKey = makeKey({
        type: "TEST",
        itemId: therapyId,
        subItemId: testId,
      });

      const cat = catalogs?.[therapyId];
      const test = findTestInCatalog(cat, testId);

      const slabs =
        test?.slabs ||
        test?.pricing_slabs ||
        test?.pricing?.slabs ||
        [];

      out.push({
        source: "DB",
        dbId: li._id,
        type: "TEST",
        itemId: therapyId,
        subItemId: testId,
        baseKey,
        rowId: `db_${li._id}`,
        displayName: `${li.name || "Test"} • (${li.therapy_name || "Therapy"})`,
        qty: 1,
        meta: {
          basePrice: toNum(li.price_per_test, 0),
          slabs, // ✅ slabs attached
          therapyId,
        },
        invoiced_count: li.invoiced_count,
        last_invoice_id: li.last_invoice_id,
      });
    }
  }

  return out;
}, [lineItems, catalogs]);


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
    setSelectedRowIds((prev) => (prev.includes(rowId) ? prev.filter((x) => x !== rowId) : [...prev, rowId]));
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
  // Remove row: ALWAYS backend
  // =====================
  const removeRow = async (it) => {
    if (!it) return;


  // ✅ HARD BLOCK: backend line-item fields (always correct)
  if (Number(it.invoiced_count || 0) > 0 || it.last_invoice_id) {
    setErrorMsg("❌ Ye item already invoice me aa chuka hai. Remove allowed nahi hai.");
    return;
  }

  const billed = billedMap?.[it.baseKey];
  if (billed?.count) {
    setErrorMsg(
      `❌ Ye item pehle invoice me billed ho chuka hai. Remove allowed nahi. (Invoices: ${(billed.invoiceNumbers || [])
        .slice(0, 3)
        .join(", ")}${(billed.invoiceNumbers || []).length > 3 ? "..." : ""})`
    );
    return;
  }

    try {
      if (!selectedCaseId || !it.dbId) {
        setErrorMsg("❌ Missing caseId/itemId for backend removal.");
        return;
      }

      await api.delete(`/cases/${selectedCaseId}/line-items/${it.dbId}`);
      await fetchLineItems(selectedCaseId, "active");

      // cleanup selection/override
      setSelectedRowIds((prev) => prev.filter((k) => k !== it.rowId));
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[it.rowId];
        return next;
      });
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.response?.data?.message || "❌ Failed to remove item.");
    }
  };

  // =====================
  // Reuse selection from invoice (NO new rows) -> auto select matching baseKeys
  // =====================
  const useFromInvoice = async (invoiceId) => {
    if (!invoiceId) return;
    try {
      const { data } = await api.get(`/invoices/${invoiceId}`);
      const inv = data?.data || data;
      const items = Array.isArray(inv?.current?.items) ? inv.current.items : [];

      const baseKeyToRow = new Map(allSelectableItems.map((r) => [r.baseKey, r]));
      const nextSelected = new Set(selectedRowIds);
      const nextOverrides = { ...overrides };

      let matched = 0;
      for (const it of items) {
        const baseKey = makeKey({ type: it.type, itemId: it.itemId, subItemId: it.subItemId });
        const row = baseKeyToRow.get(baseKey);
        if (!row) continue;

        nextSelected.add(row.rowId);
        nextOverrides[row.rowId] = { qty: String(it.qty ?? row.qty ?? 1) };
        matched += 1;
      }

      if (!matched) {
        setErrorMsg("⚠️ Invoice items ka match current case line-items me nahi mila.");
        return;
      }

      setSelectedRowIds(Array.from(nextSelected));
      setOverrides(nextOverrides);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load invoice items for selection.");
    }
  };

  // =====================
  // Generate invoice
  // =====================
const generateInvoice = async () => {
  setErrorMsg("");
  if (!selectedCaseId) return setErrorMsg("Please select a case.");
  if (!selectedItemsResolved.length) return setErrorMsg("Please tick at least 1 item.");

  // ✅ DB-only flow => must have dbId for every selected item
  const missing = selectedItemsResolved.find((x) => !x.dbId);
  if (missing) {
    return setErrorMsg("❌ Some selected rows are not saved in server line-items. Please add them first.");
  }

  try {
    setSaving(true);

    // ✅ BACKEND expects: items[{ caseItemId, units }]
    const itemsPayload = selectedItemsResolved.map((it) => ({
      caseItemId: it.dbId,  // ✅ CaseItem _id
      units: it.qty,        // ✅ SUB sessions / TEST qty
    }));

    const res = await api.post(`/cases/${selectedCaseId}/invoices`, {
      tax_percent: 0,        // ✅ backend field name
      notes: "",             // optional
      items: itemsPayload,
    });

    const created = res.data?.data || res.data;
    const invoiceId = created?._id || created?.invoiceId;

    // refresh everything
    await fetchInvoices(selectedCaseId);
    await hydrateBilledMap(selectedCaseId, (x) => makeKey(x));
    await fetchLineItems(selectedCaseId, "active");

    // clear selection after success
    setSelectedRowIds([]);
    setOverrides({});

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


  const openAddModal = async () => {
    setAddOpen(true);
    try {
      await fetchTherapies();
    } catch {}
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
          <div className="mt-2 text-sm text-slate-500">API-based ✅ (No localStorage)</div>
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
                      {caseDetail?.patient_name || selectedCaseBrief?.patient_name || selectedCaseBrief?.p_id || "—"}
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
                    title="Reuse selections from invoice (auto-select matching items)"
                  >
                    <option value="" disabled>
                      Reuse from invoice…
                    </option>
                    {(invoices || []).map((inv) => (
                      <option key={inv.invoiceId || inv._id} value={inv.invoiceId || inv._id}>
                        {inv.invoiceNumber || inv._id} (v{inv.currentVersionNo || 1})
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
            {lineItemsLoading ? " • Loading line items…" : null}
            {lineItemsError ? ` • ${lineItemsError}` : null}
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
        api={api}
        caseId={selectedCaseId}
        onItemsAdded={async () => {
          await fetchCaseDetail(selectedCaseId);
          await fetchLineItems(selectedCaseId, "active");
        }}
        therapyList={therapyList}
        therapyLoading={therapyLoading}
        catalogs={catalogs}
        catalogLoading={catalogLoading}
        loadCatalogForTherapy={loadCatalogForTherapy}
      />
    </div>
  );
}
