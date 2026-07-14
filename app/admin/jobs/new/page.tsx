import { requireRole } from "@/lib/guard";
import { listAllTechs, listEquipmentTypes } from "@/lib/data";
import { createJobAction } from "@/app/admin/actions";

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  await requireRole("ADMIN");
  const { created } = await searchParams;
  const techs = await listAllTechs();
  const equipmentTypes = listEquipmentTypes();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">New Job</h1>
      <p className="mb-6 text-sm text-ink-500">Create and dispatch a job directly</p>

      {created && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
          Job created and scheduled.
        </div>
      )}

      <form action={createJobAction} className="flex flex-col gap-6 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Customer</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Name</label>
              <input name="customerName" required className="h-10 rounded-lg border border-sand-300 px-3 text-sm" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Address</label>
              <input name="address" required className="h-10 rounded-lg border border-sand-300 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Phone</label>
              <input name="phone" className="h-10 rounded-lg border border-sand-300 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Email</label>
              <input name="email" type="email" className="h-10 rounded-lg border border-sand-300 px-3 text-sm" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Lead source</label>
              <input name="leadSource" placeholder="e.g. phone call, referral" className="h-10 rounded-lg border border-sand-300 px-3 text-sm" />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Equipment</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Type</label>
              <select name="equipmentType" required className="h-10 rounded-lg border border-sand-300 px-2 text-sm">
                <option value="">Select…</option>
                {equipmentTypes.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Make</label>
              <input name="equipmentMake" className="h-10 rounded-lg border border-sand-300 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Model</label>
              <input name="equipmentModel" className="h-10 rounded-lg border border-sand-300 px-3 text-sm" />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Job</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Job type</label>
              <input name="jobType" required placeholder="e.g. Repair, Install, Inspection" className="h-10 rounded-lg border border-sand-300 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Assign tech</label>
              <select name="techId" required className="h-10 rounded-lg border border-sand-300 px-2 text-sm">
                <option value="">Select…</option>
                {techs.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Schedule for</label>
              <input type="datetime-local" name="scheduledAt" required className="h-10 rounded-lg border border-sand-300 px-3 text-sm" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-700">Notes</label>
              <textarea name="notes" rows={3} className="rounded-lg border border-sand-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <button type="submit" className="h-11 w-fit rounded-lg bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800">
          Create &amp; Schedule
        </button>
      </form>
    </div>
  );
}
