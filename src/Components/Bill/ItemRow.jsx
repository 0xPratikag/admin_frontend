// src/pages/billing/components/ItemRow.jsx
import React from "react";
import { inr } from "./_billingUtils";
export default function ItemRow({
  it,
  idx,
  checked,
  onToggle,
  qtyValue,
  onQtyChange,
  pricing,
  billedInfo,
  canRemove,
  onRemove,
  onDuplicate,
}) {
  const isPlan = it.source === "PLAN";

  return (
    <tr className="border-b last:border-b-0 hover:bg-slate-50/60">
      {/* Pick */}
      <td className="px-4 py-3 w-14">
        <input type="checkbox" checked={checked} onChange={onToggle} />
      </td>

      {/* Name */}
      <td className="py-3 pr-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg border bg-white flex items-center justify-center text-xs text-slate-700">
            {String(idx + 1).padStart(2, "0")}
          </div>

          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">{it.displayName}</div>

            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  it.type === "THERAPY"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {it.type}
              </span>

              {isPlan ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                  Plan
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Custom
                </span>
              )}

              <button
                type="button"
                onClick={onDuplicate}
                className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-700 hover:bg-white"
                title="Duplicate as new row"
              >
                Duplicate
              </button>

              <button
                type="button"
                onClick={onRemove}
                disabled={!canRemove}
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  canRemove
                    ? "border-red-200 text-red-700 hover:bg-red-50"
                    : "border-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                title={
                  canRemove
                    ? isPlan
                      ? "Hide from billing list"
                      : "Remove this row"
                    : "Already billed earlier, remove disabled"
                }
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </td>

      {/* Qty */}
      <td className="py-3 pr-4 w-40">
        <input
          type="number"
          min="1"
          step="1"
          value={qtyValue}
          onChange={(e) => onQtyChange(e.target.value)}
          className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="text-[11px] text-slate-500 mt-1">Type qty first, then tick ✅</div>
      </td>

      {/* Discount */}
      <td className="py-3 pr-4 w-40">
        <div className="font-semibold text-slate-900">{pricing.discountPct || 0}%</div>
        <div className="text-[11px] text-slate-500">{inr(pricing.rowDiscount || 0)}</div>
      </td>

      {/* Total */}
      <td className="py-3 pr-4 w-44">
        <div className="font-bold text-slate-900">{inr(pricing.rowTotal || 0)}</div>
        <div className="text-[11px] text-slate-500">Net</div>
      </td>

      {/* Status */}
      <td className="py-3 pr-4 w-72">
        <div className="flex flex-wrap gap-2">
          {billedInfo?.count ? (
            <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              Billed before ({billedInfo.count})
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
              Not billed
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
