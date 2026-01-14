// ItemsTable.jsx
import React from "react";
import ItemRow from "./ItemRow";
import { resolvePricing, resolveQtyFromOverrides } from "./billingHelpers";

export default function ItemsTable({
  items,
  selectedRowIds,
  overrides,
  onToggleRow,
  onQtyChange,
  billedMap,
  onRemoveRow,
  onDuplicateRow,

  // ✅ optional: pass toast fn from parent (recommended)
  onBlockedSelect, // (msg) => void
}) {
  const notifyBlocked = (msg) => {
    if (onBlockedSelect) return onBlockedSelect(msg);
    alert(msg); // fallback
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-600 border-t border-b bg-white">
            <th className="px-4 py-3">✔</th>
            <th className="py-3 pr-4">Therapy / Test</th>
            <th className="py-3 pr-4">Qty</th>
            <th className="py-3 pr-4">Discount</th>
            <th className="py-3 pr-4">Total</th>
            <th className="py-3 pr-4">Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((it, idx) => {
            const checked = selectedRowIds.includes(it.rowId);

            const qty = resolveQtyFromOverrides(it.rowId, it, overrides);
            const pricing = resolvePricing(it, qty);

            const key = String(it.dbId || it._id || "");
            const billedInfo = key ? billedMap?.[key] : undefined;

            const alreadyInvoiced =
              Number(it.invoiced_count || 0) > 0 || !!it.last_invoice_id;

            const canRemove = !alreadyInvoiced && !(billedInfo?.count > 0);

            const qtyValue = overrides?.[it.rowId]?.qty ?? it.qty;

            // ✅ Guarded toggle
            const handleToggle = () => {
              if (!canRemove) {
                const invs = Array.isArray(billedInfo?.invoiceNumbers)
                  ? billedInfo.invoiceNumbers
                  : [];
                const invText = invs.length ? ` (${invs.slice(0, 3).join(", ")})` : "";

                notifyBlocked(
                  `You can't select this row — invoice already created for this item${invText}.`
                );
                return;
              }
              onToggleRow(it.rowId);
            };

            return (
              <ItemRow
                key={it.rowId}
                it={it}
                idx={idx}
                checked={checked}
                onToggle={handleToggle}
                qtyValue={qtyValue}
                onQtyChange={(raw) => onQtyChange(it.rowId, raw)}
                pricing={pricing}
                billedInfo={billedInfo}
                canRemove={canRemove}
                onRemove={() => onRemoveRow(it)}
                onDuplicate={() => onDuplicateRow(it)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
