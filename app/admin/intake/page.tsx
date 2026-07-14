import { requireRole } from "@/lib/guard";
import { listAllTechs, listUnassignedJobs } from "@/lib/data";
import { assignIntakeJobAction } from "@/app/admin/actions";

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function IntakeQueuePage({ searchParams }: { searchParams: Promise<{ assigned?: string }> }) {
  await requireRole("ADMIN");
  const { assigned } = await searchParams;
  const [jobs, techs] = await Promise.all([listUnassignedJobs(), listAllTechs()]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Intake Queue</h1>
      <p className="mb-6 text-sm text-ink-500">New calls awaiting dispatch — assign a technician and a time</p>

      {assigned && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
          Job assigned and scheduled.
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sand-300 bg-white p-8 text-center text-ink-500">
          No new calls waiting on dispatch.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {jobs.map((j: any) => (
            <div key={j.id} className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-navy-900">{j.customer_name}</p>
                  <p className="text-sm text-ink-500">{j.customer_address}</p>
                  {j.customer_phone && <p className="text-sm text-ink-500">{j.customer_phone}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold text-ink-700">{j.source.replace("_", " ")}</span>
                  {j.lead_source && <span className="text-xs text-ink-500">via {j.lead_source}</span>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-navy-900/5 px-2 py-1 font-medium text-navy-800">{j.job_type}</span>
                {j.equipment_type && <span className="text-ink-500">{j.equipment_type} {j.equipment_make ? `· ${j.equipment_make} ${j.equipment_model || ""}` : ""}</span>}
              </div>
              {j.notes && <p className="mt-2 text-sm text-ink-700">{j.notes}</p>}

              <form action={assignIntakeJobAction} className="mt-4 flex flex-wrap items-end gap-3 border-t border-sand-200 pt-4">
                <input type="hidden" name="jobId" value={j.id} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Assign tech</label>
                  <select name="techId" required className="h-10 rounded-lg border border-sand-300 px-2 text-sm">
                    <option value="">Select…</option>
                    {techs.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Schedule for</label>
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    required
                    defaultValue={toLocalInputValue(j.scheduled_at)}
                    className="h-10 rounded-lg border border-sand-300 px-2 text-sm"
                  />
                </div>
                <button type="submit" className="h-10 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800">
                  Dispatch
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
