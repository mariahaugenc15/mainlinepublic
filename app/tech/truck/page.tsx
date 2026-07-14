import { requireRole } from "@/lib/guard";
import { getTruckForTech, getTruckStock } from "@/lib/data";
import { requestRestockAction } from "@/app/tech/actions";

export default async function TruckStockPage({ searchParams }: { searchParams: Promise<{ requested?: string }> }) {
  const user = await requireRole("TECH");
  const { requested } = await searchParams;
  const truck = await getTruckForTech(user.id);
  const stock = truck?.truck_id ? await getTruckStock(truck.truck_id) : [];

  const byCategory = new Map<string, typeof stock>();
  for (const s of stock) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, []);
    byCategory.get(s.category)!.push(s);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-semibold text-navy-900">My Truck Stock</h1>
      <p className="mb-4 text-sm text-ink-500">{stock.filter((s: any) => s.quantity < s.threshold).length} part(s) below threshold</p>

      {requested && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Restock request sent to procurement.
        </div>
      )}

      {Array.from(byCategory.entries()).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">{category}</h2>
          <div className="flex flex-col gap-2">
            {items.map((s: any) => {
              const low = s.quantity < s.threshold;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-sand-300 bg-white px-4 py-3 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{s.part_name}</p>
                    <p className="text-xs text-ink-500">{s.part_number}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${low ? "text-danger" : "text-ink-700"}`}>
                      {s.quantity} <span className="text-xs font-normal text-ink-500">/ {s.threshold} min</span>
                    </span>
                    {low && (
                      <form action={requestRestockAction}>
                        <input type="hidden" name="truckId" value={s.truck_id} />
                        <input type="hidden" name="partId" value={s.part_id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-navy-950 active:bg-amber-600"
                        >
                          Request
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
