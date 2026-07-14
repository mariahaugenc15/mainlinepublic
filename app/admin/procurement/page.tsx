import { requireRole } from "@/lib/guard";
import {
  listAllTruckStock,
  listLowStock,
  listPendingRestockRequests,
  getReorderSuggestions,
  listVendorsForPart,
  listVendors,
  listPurchaseOrders,
} from "@/lib/data";
import { createPurchaseOrderAction, fulfillRestockAction } from "@/app/admin/actions";

export default async function ProcurementPage({
  searchParams,
}: {
  searchParams: Promise<{ ordered?: string; fulfilled?: string }>;
}) {
  await requireRole("ADMIN");
  const { ordered, fulfilled } = await searchParams;
  const [lowStock, pendingRequests, rawSuggestions, vendors, purchaseOrders, allStock] = await Promise.all([
    listLowStock(),
    listPendingRestockRequests(),
    getReorderSuggestions(),
    listVendors(),
    listPurchaseOrders(),
    listAllTruckStock(),
  ]);
  const suggestions = await Promise.all(
    rawSuggestions.map(async (s: any) => ({
      ...s,
      partVendors: await listVendorsForPart(s.part_id),
    }))
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Procurement & Truck Stock</h1>
      <p className="mb-6 text-sm text-ink-500">Inventory health, restock requests, and reorder suggestions across the fleet</p>

      {ordered && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Purchase order submitted.
        </div>
      )}
      {fulfilled && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Restock request marked fulfilled.
        </div>
      )}

      <div className="mb-8 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Reorder Suggestions ({suggestions.length})
        </h2>
        <p className="mb-4 text-xs text-ink-500">
          Auto-generated from current shortfalls and diagnostic part demand
        </p>
        <div className="flex flex-col gap-3">
          {suggestions.map((s: any) => {
            const partVendors = s.partVendors;
            const cheapest = partVendors[0];
            return (
              <div key={s.part_id} className="flex flex-col gap-2 rounded-lg border border-sand-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-900">{s.part_name} <span className="text-xs text-ink-500">({s.part_number})</span></p>
                  <p className="text-xs text-ink-500">
                    {s.trucks_low} truck{s.trucks_low === 1 ? "" : "s"} below threshold · deficit {s.total_deficit} units
                    {s.diagnostic_demand > 0 && ` · referenced in ${s.diagnostic_demand} recent diagnoses`}
                  </p>
                </div>
                {cheapest && (
                  <form action={createPurchaseOrderAction} className="flex items-center gap-2">
                    <input type="hidden" name="partId" value={s.part_id} />
                    <select name="vendorId" defaultValue={cheapest.id} className="rounded-lg border border-sand-300 px-2 py-1.5 text-xs">
                      {partVendors.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.name} — ${v.price.toFixed(2)}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      name="quantity"
                      defaultValue={Math.max(s.total_deficit, 1)}
                      min={1}
                      className="w-16 rounded-lg border border-sand-300 px-2 py-1.5 text-xs"
                    />
                    <button type="submit" className="whitespace-nowrap rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800">
                      Create PO
                    </button>
                  </form>
                )}
              </div>
            );
          })}
          {suggestions.length === 0 && <p className="text-sm text-ink-500">No reorder suggestions right now.</p>}
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Low Stock Alerts ({lowStock.length})</h2>
          <div className="flex flex-col gap-2">
            {lowStock.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm">
                <span className="text-ink-700">{s.part_name} — {s.truck_name}</span>
                <span className="font-semibold text-danger">{s.quantity}/{s.threshold}</span>
              </div>
            ))}
            {lowStock.length === 0 && <p className="text-sm text-ink-500">All trucks fully stocked.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Pending Restock Requests ({pendingRequests.length})</h2>
          <div className="flex flex-col gap-2">
            {pendingRequests.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-sand-200 px-3 py-2 text-sm">
                <div>
                  <p className="text-ink-700">{r.part_name} — {r.truck_name}</p>
                  <p className="text-xs text-ink-500">Requested by {r.requested_by_name}</p>
                </div>
                <form action={fulfillRestockAction}>
                  <input type="hidden" name="restockId" value={r.id} />
                  <button type="submit" className="rounded-lg bg-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-sand-300">
                    Mark Fulfilled
                  </button>
                </form>
              </div>
            ))}
            {pendingRequests.length === 0 && <p className="text-sm text-ink-500">No pending requests.</p>}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Vendor / Supplier Reference</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Lead Time</th>
              <th className="px-3 py-2">Parts Offered</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v: any) => (
              <tr key={v.id} className="border-t border-sand-200">
                <td className="px-3 py-2 font-medium text-ink-900">{v.name}</td>
                <td className="px-3 py-2 text-ink-700">{v.contact_name} · {v.contact_email}</td>
                <td className="px-3 py-2 text-ink-700">{v.lead_time_days} days</td>
                <td className="px-3 py-2 text-ink-700">{v.parts_offered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-8 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Recent Purchase Orders</h2>
        <div className="flex flex-col gap-2">
          {purchaseOrders.slice(0, 10).map((po: any) => (
            <div key={po.id} className="flex items-center justify-between rounded-lg border border-sand-200 px-3 py-2 text-sm">
              <span className="text-ink-700">{po.vendor_name} — {po.item_count} item{po.item_count === 1 ? "" : "s"}</span>
              <span className="text-ink-500">${po.total_cost.toFixed(2)} · {po.status} · {po.created_at?.slice(0, 10)}</span>
            </div>
          ))}
          {purchaseOrders.length === 0 && <p className="text-sm text-ink-500">No purchase orders yet.</p>}
        </div>
      </div>

      <details className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-ink-500">
          Full Truck Stock Inventory ({allStock.length} items)
        </summary>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-3 py-2">Truck</th>
              <th className="px-3 py-2">Part</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Qty / Threshold</th>
            </tr>
          </thead>
          <tbody>
            {allStock.map((s: any) => (
              <tr key={s.id} className="border-t border-sand-200">
                <td className="px-3 py-2 text-ink-700">{s.truck_name}</td>
                <td className="px-3 py-2 text-ink-700">{s.part_name}</td>
                <td className="px-3 py-2 text-ink-700">{s.category}</td>
                <td className={`px-3 py-2 font-medium ${s.quantity < s.threshold ? "text-danger" : "text-ink-700"}`}>
                  {s.quantity} / {s.threshold}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
