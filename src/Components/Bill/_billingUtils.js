export const toInputDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
};

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(n || 0)
  );

export const toNum = (v, def = 0) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : def;
};

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function makeKey({ type, itemId, subItemId }) {
  return `${type}|${String(itemId || "")}|${String(subItemId || "")}`;
}

export function buildAxios() {
  return {
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    withCredentials: true,
  };
}

export function lsKey(prefix, caseId) {
  return `${prefix}_${String(caseId || "")}`;
}
