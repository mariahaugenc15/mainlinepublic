import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { listEquipmentTypes } from "@/lib/data";
import { createOnSiteCallAction } from "@/app/tech/actions";

export default async function NewCallPage() {
  await requireRole("TECH");
  const equipmentTypes = listEquipmentTypes();

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/tech" className="mb-3 inline-block text-sm font-medium text-navy-700">&larr; Back to queue</Link>
      <h1 className="mb-4 text-xl font-semibold text-navy-900">New Customer Call</h1>

      <form action={createOnSiteCallAction} className="flex flex-col gap-4">
        <div className="rounded-xl border border-sand-300 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Customer</h2>
          <div className="flex flex-col gap-3">
            <input name="customerName" required placeholder="Customer name" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
            <input name="address" required placeholder="Service address" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
            <input name="phone" placeholder="Phone (optional)" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
          </div>
        </div>

        <div className="rounded-xl border border-sand-300 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Equipment</h2>
          <div className="flex flex-col gap-3">
            <select name="equipmentType" required className="h-12 rounded-lg border border-sand-300 px-3 text-base">
              <option value="">Select equipment type…</option>
              {equipmentTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input name="equipmentMake" placeholder="Make (optional)" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
            <input name="equipmentModel" placeholder="Model (optional)" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
          </div>
        </div>

        <div className="rounded-xl border border-sand-300 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Job</h2>
          <div className="flex flex-col gap-3">
            <input name="jobType" required placeholder="Job type (e.g. Toilet Repair)" className="h-12 rounded-lg border border-sand-300 px-3 text-base" />
            <textarea name="notes" placeholder="Notes (optional)" className="rounded-lg border border-sand-300 p-3 text-base" rows={3} />
          </div>
        </div>

        <button
          type="submit"
          className="flex h-14 w-full items-center justify-center rounded-xl bg-navy-900 text-base font-semibold text-white shadow-sm active:bg-navy-800"
        >
          Create &amp; Start Job
        </button>
      </form>
    </div>
  );
}
