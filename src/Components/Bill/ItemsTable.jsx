// src/pages/billing/components/ItemsTable.jsx
import React from "react";
import ItemRow from "./ItemRow";
import { resolvePricing ,resolveQtyFromOverrides} from "./billingHelpers";

export default function ItemsTable({
  items,
  selectedRowIds,
  overrides,
  onToggleRow,
  onQtyChange,
  billedMap,
  onRemoveRow,
  onDuplicateRow,
}) {
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

            const billedInfo = billedMap?.[it.baseKey];

            // ✅ Remove allowed for ANY row if never billed
            const canRemove = !(billedInfo?.count);

            const qtyValue = overrides?.[it.rowId]?.qty ?? it.qty;

            return (
              <ItemRow
                key={it.rowId}
                it={it}
                idx={idx}
                checked={checked}
                onToggle={() => onToggleRow(it.rowId)}
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
