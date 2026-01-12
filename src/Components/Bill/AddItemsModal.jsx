// src/pages/billing/components/AddItemsModal.jsx
import React, { useMemo, useState } from "react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

import { toNum ,clamp, inr, round2} from "./_billingUtils";
import { formatSlabs ,computeDiscountPercent } from "./billingHelpers";


export default function AddItemsModal({
  open,
  onClose,
    api,         // ✅ NEW
  caseId,      // ✅ NEW
  onItemsAdded,// ✅ NEW
  therapyList,
  therapyLoading,
  catalogs,
  catalogLoading,
  loadCatalogForTherapy,
  makeNewCustomRows, // (rows) => void
  makeRowFromCatalog, // helper from parent
}) {
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);
  const [therapyId, setTherapyId] = useState("");
  const [subPick, setSubPick] = useState({}); // subId -> qty string
  const [testPick, setTestPick] = useState({}); // testId -> bool
  const [testSearch, setTestSearch] = useState("");

  const cat = useMemo(() => {
    if (!therapyId) return { subtherapies: [], tests: [] };
    return catalogs[String(therapyId)] || { subtherapies: [], tests: [] };
  }, [therapyId, catalogs]);

  const onTherapyChange = async (id) => {
    setAddError("");
    setTherapyId(id);
    setSubPick({});
    setTestPick({});
    setTestSearch("");
    if (!id) return;

    try {
      await loadCatalogForTherapy(id);

      const nextCat = catalogs[String(id)] || { subtherapies: [], tests: [] };
      const sp = {};
      for (const s of nextCat.subtherapies || []) sp[String(s._id)] = "";
      setSubPick(sp);

      const tp = {};
      for (const t of nextCat.tests || []) tp[String(t._id)] = false;
      setTestPick(tp);
    } catch (e) {
      console.error(e);
      setAddError("Failed to load therapy items.");
    }
  };

const addPicked = async () => {
  setAddError("");
  if (!caseId) return setAddError("Case missing. Please select a case first.");
  if (!therapyId) return setAddError("Select a therapy first.");

  const rows = [];

  // ---------- build rows (UI list) ----------
  for (const s of cat.subtherapies || []) {
    const sid = String(s._id);
    const raw = subPick[sid];
    if (raw === "" || raw === null || raw === undefined) continue;

    const qty = clamp(toNum(raw, 1), 1, 999999);
    rows.push(makeRowFromCatalog({ therapyId, therapyName: null, kind: "SUB", doc: s, qty }));
  }

  for (const t of cat.tests || []) {
    const xid = String(t._id);
    if (!testPick[xid]) continue;
    rows.push(makeRowFromCatalog({ therapyId, therapyName: null, kind: "TEST", doc: t, qty: 1 }));
  }

  if (!rows.length) return setAddError("Select at least 1 sub-therapy (qty) or test.");

  // ---------- build API payload (grouped by therapyId) ----------
  const subTherapyPayload = [];
  for (const s of cat.subtherapies || []) {
    const sid = String(s._id);
    const raw = subPick[sid];
    if (raw === "" || raw === null || raw === undefined) continue;

    const sessions_count = clamp(toNum(raw, 1), 1, 999999);
    const discount_percent = computeDiscountPercent(s?.discountSlabs, sessions_count);

    subTherapyPayload.push({
      subTherapyId: sid,
      sessions_count,
      // optional (UI me fields nahi hai abhi)
      start_date: undefined,
      end_date: undefined,
      discount_percent,
    });
  }

  const testsPayload = [];
  for (const t of cat.tests || []) {
    const xid = String(t._id);
    if (!testPick[xid]) continue;
    testsPayload.push({ testId: xid });
  }

  const payload = {
    mode: "append", // ✅ duplicates allow (new entry)
    items: [
      {
        therapyId,
        subTherapy: subTherapyPayload,
        therapyTestsEnabled: testsPayload.length > 0,
        tests: testsPayload,
      },
    ],
  };

  // ---------- CALL API ----------
  try {
    setSaving(true);

    // ✅ Use the route you finalized:
    // If you used: POST /cases/:caseId/add-items
    await api.post(`/cases/${caseId}/add-items`, payload);

    // (if you used /addItemsToCasePlan/:caseId, then:)
    // await api.post(`/addItemsToCasePlan/${caseId}`, payload);

    // ✅ update billing UI list
    makeNewCustomRows(rows);

    // ✅ refresh caseDetail so plan updates reflect
    if (onItemsAdded) await onItemsAdded();

    onClose();
  } catch (e) {
    console.error(e);
    setAddError(e?.response?.data?.error || e?.response?.data?.message || "Failed to add items.");
  } finally {
    setSaving(false);
  }
};


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] flex items-center justify-center">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between sticky top-0 z-10">
            <div>
              <div className="font-extrabold text-slate-900">Add Items</div>
              <div className="text-xs text-slate-500">
                Same item dubara add karoge to new row banegi (qty merge nahi hoga).
              </div>
            </div>

            <button
              type="button"
              className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="max-h-[calc(100vh-190px)] overflow-y-auto">
            {addError ? (
              <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                {addError}
              </div>
            ) : null}

            <div className="px-5 pb-5">
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">Select Therapy</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400"
                    value={therapyId}
                    onChange={(e) => onTherapyChange(e.target.value)}
                    disabled={therapyLoading}
                  >
                    <option value="">Choose…</option>
                    {(therapyList || []).map((t) => (
                      <option key={t._id} value={String(t._id)}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-slate-500 mt-2">Qty blank = not selected</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">Quick info</div>
                  <div className="text-xs text-slate-600 mt-2">• Sub-therapy: qty blank = not selected</div>
                  <div className="text-xs text-slate-600 mt-1">• Tests: checkbox, qty=1</div>
                </div>
              </div>

              {/* Sub-therapies */}
              <div className="mt-6">
                <div className="font-bold text-slate-900">Sub-therapies</div>

                <div className="mt-2 overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-600 border-b bg-slate-50">
                        <th className="py-3 px-4">Sub-therapy</th>
                        <th className="py-3 pr-4">Sessions Qty</th>
                        <th className="py-3 pr-4">Discount</th>
                        <th className="py-3 pr-4">Net / unit</th>
                        <th className="py-3 pr-4">Slabs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {therapyId ? (
                        (cat.subtherapies || []).map((s) => {
                          const sid = String(s._id);
                          const raw = subPick[sid];
                          const qty = raw === "" ? "" : clamp(toNum(raw, 1), 1, 999999);

                          const base = toNum(s?.price_per_session ?? s?.pricePerSession, 0);
                          const pct = qty ? computeDiscountPercent(s?.discountSlabs, qty) : 0;
                          const unitNet = Math.max(0, round2(base * (1 - pct / 100)));

                          return (
                            <tr key={sid} className="border-b last:border-b-0">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900">{s.name}</div>
                                {!!(s?.duration_mins ?? s?.duration) && (
                                  <div className="text-xs text-slate-500">
                                    Duration: {s?.duration_mins ?? s?.duration} mins
                                  </div>
                                )}
                                <div className="text-xs text-slate-500 mt-1">
                                  Base: <span className="font-semibold text-slate-700">{inr(base)}</span>
                                </div>
                              </td>

                              <td className="py-3 pr-4">
                                <input
                                  type="number"
                                  min="1"
                                  value={raw}
                                  onChange={(e) => setSubPick((p) => ({ ...p, [sid]: e.target.value }))}
                                  className="border border-slate-200 rounded-xl px-3 py-2 w-32 outline-none focus:ring-2 focus:ring-indigo-400"
                                  placeholder="blank = not selected"
                                />
                              </td>

                              <td className="py-3 pr-4">
                                <div className="font-bold text-slate-900">{qty ? `${pct}%` : "—"}</div>
                              </td>

                              <td className="py-3 pr-4 font-bold text-slate-900">
                                {qty ? inr(unitNet) : <span className="text-slate-400">—</span>}
                              </td>

                              <td className="py-3 pr-4">
                                <Tippy
                                  content={
                                    <div className="w-[320px]">
                                      <div className="text-sm font-semibold text-slate-900 mb-2">
                                        {s.name} — Slabs
                                      </div>
                                      <div className="text-xs text-slate-700">{formatSlabs(s.discountSlabs)}</div>
                                    </div>
                                  }
                                  theme="light-border"
                                  placement="right"
                                  interactive
                                  appendTo={() => document.body}
                                  maxWidth={360}
                                  delay={[80, 0]}
                                >
                                  <button
                                    type="button"
                                    className="text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-white"
                                  >
                                    View
                                  </button>
                                </Tippy>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 px-4 text-slate-500">
                            Select a therapy to load sub-therapies.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-xs text-slate-500">Tip: qty blank = not selected.</div>
              </div>

              {/* Tests */}
              <div className="mt-7">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-bold text-slate-900">Tests</div>
                  <input
                    className="border border-slate-200 rounded-xl px-4 py-3 text-sm w-full sm:w-72 outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Search tests..."
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    disabled={!therapyId}
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {(therapyId
                    ? (cat.tests || []).filter((t) =>
                        (t?.name || "").toLowerCase().includes((testSearch || "").toLowerCase())
                      )
                    : []
                  ).map((t) => {
                    const xid = String(t._id);
                    const checked = !!testPick[xid];
                    const price = toNum(t.price_per_test ?? t.pricePerTest, 0);

                    return (
                      <label
                        key={xid}
                        className="flex items-center gap-2 border border-slate-200 rounded-xl p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setTestPick((p) => ({ ...p, [xid]: e.target.checked }))}
                        />
                        <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                        <span className="ml-auto text-xs text-slate-600">{inr(price)}</span>
                      </label>
                    );
                  })}

                  {therapyId && !(cat.tests || []).length ? (
                    <div className="text-sm text-slate-500">No tests configured.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t bg-white flex justify-end gap-3 sticky bottom-0 z-10">
            <button
              type="button"
              className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              onClick={onClose}
            >
              Cancel
            </button>
          <button
  type="button"
  className="px-6 py-3 rounded-xl text-white font-extrabold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
  onClick={addPicked}
  disabled={saving || catalogLoading[String(therapyId)]}
>
  {saving ? "Adding..." : "Add Selected"}
</button>
          </div>
        </div>
      </div>
    </div>
  );
}
