// src/pages/billing/billingHelpers.js
import { clamp, round2, toNum } from "./_billingUtils";

// =====================
// Safe catalog readers
// =====================
export const getItems = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.items)) return resData.items;
  if (Array.isArray(resData.data)) return resData.data;
  return [];
};

// =====================
// Discount slab helpers
// =====================
export function computeDiscountPercent(discountSlabs, sessionsCount) {
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

export function formatSlabs(discountSlabs) {
  if (!Array.isArray(discountSlabs) || discountSlabs.length === 0) return "No slabs";
  const active = discountSlabs.filter((x) => x && x.isActive !== false);
  if (!active.length) return "No active slabs";
  const sorted = [...active].sort(
    (a, b) => Number(a.min_sessions || 0) - Number(b.min_sessions || 0)
  );
  return sorted.map((s) => `${s.min_sessions}-${s.max_sessions}: ${s.discount_percent}%`).join(", ");
}

// =====================
// Pricing resolver
// =====================
export function resolvePricing(it, qty) {
  const basePrice = toNum(it?.meta?.basePrice, 0);
  const slabs = Array.isArray(it?.meta?.slabs) ? it.meta.slabs : [];
  const discountPct = it.type === "THERAPY" ? computeDiscountPercent(slabs, qty) : 0;

  const unitNet = Math.max(0, round2(basePrice * (1 - discountPct / 100)));
  const rowTotal = round2(unitNet * qty);
  const rowBase = round2(basePrice * qty);
  const rowDiscount = Math.max(0, round2(rowBase - rowTotal));

  return { basePrice, discountPct, unitNet, rowTotal, rowDiscount, rowBase };
}

export function resolveQtyFromOverrides(rowId, it, overrides) {
  const o = overrides?.[rowId] || {};
  return clamp(toNum(o.qty ?? it.qty, it.qty), 1, 999999);
}
