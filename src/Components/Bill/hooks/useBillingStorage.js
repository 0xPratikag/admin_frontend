export function makeRowId(prefix = "r") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function stablePlanRowId(baseKey) {
  return `p_${String(baseKey || "").replace(/[^a-zA-Z0-9_:-]/g, "_")}`;
}
