import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { getCustomerHistory, getJob, getSessionForJob, getTruckForTech, getTruckStock, getTreeIdForEquipmentType } from "@/lib/data";
import { startDiagnosticAction, cancelJobDiagnosticAction } from "@/app/tech/actions";
import DeleteJobButton from "@/app/tech/_components/DeleteJobButton";

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const user = await requireRole("TECH");
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) notFound();

  const [history, existingSession, truck] = await Promise.all([
    getCustomerHistory(job.customer_id, jobId),
    getSessionForJob(jobId),
    getTruckForTech(user.id),
  ]);
  const stock = truck?.truck_id ? await getTruckStock(truck.truck_id) : [];

  const treeId = getTreeIdForEquipmentType(job.equipment_type);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/tech" className="mb-3 inline-block text-sm font-medium text-navy-700">&larr; Back to queue</Link>

      <div className="rounded-xl border border-sand-300 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-navy-900">{job.customer_name}</h1>
        <p className="text-sm text-ink-500">{job.customer_address}</p>
        {job.customer_phone && <p className="text-sm text-ink-500">{job.customer_phone}</p>}
        <div className="mt-3 rounded-lg bg-sand-100 px-3 py-2 text-sm font-medium text-navy-800">{job.job_type}</div>
      </div>

      {job.equipment_type && (
        <div className="mt-4 rounded-xl border border-sand-300 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Equipment on File</h2>
          <p className="text-base text-ink-900">{job.equipment_type}</p>
          <p className="text-sm text-ink-500">
            {job.equipment_make} {job.equipment_model} {job.equipment_install_year ? `· Installed ${job.equipment_install_year}` : ""}
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 rounded-xl border border-sand-300 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Customer History</h2>
          <ul className="flex flex-col gap-2">
            {history.map((h: any) => (
              <li key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{h.job_type} — {new Date(h.scheduled_at).toLocaleDateString()}</span>
                {h.actual_diagnosis && (
                  <span className={`text-xs ${h.matched ? "text-success" : "text-ink-500"}`}>{h.actual_diagnosis}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {existingSession && existingSession.status !== "closed" ? (
          <>
            <Link
              href={
                existingSession.status === "awaiting_review"
                  ? `/tech/jobs/${jobId}/second-opinion?session=${existingSession.id}`
                  : existingSession.status === "diagnosed"
                  ? `/tech/jobs/${jobId}/closeout?session=${existingSession.id}`
                  : `/tech/jobs/${jobId}/diagnose?session=${existingSession.id}`
              }
              className="flex h-14 items-center justify-center rounded-xl bg-amber-500 text-base font-semibold text-navy-950 shadow-sm active:bg-amber-600"
            >
              Resume Diagnostic
            </Link>
            <form action={cancelJobDiagnosticAction.bind(null, jobId)}>
              <button
                type="submit"
                className="flex h-10 w-full items-center justify-center rounded-xl border border-sand-300 bg-white text-sm font-medium text-ink-500 active:bg-sand-100"
              >
                ← Start Over / Change Diagnostic Method
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href={`/tech/jobs/${jobId}/photo`}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-navy-900 text-base font-semibold text-white shadow-sm active:bg-navy-800"
            >
              <span>📷</span> Diagnose by Photo
            </Link>
            <form action={startDiagnosticAction.bind(null, jobId)}>
              <button
                type="submit"
                disabled={!treeId}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-sand-300 bg-white text-sm font-medium text-navy-800 shadow-sm active:bg-sand-100 disabled:opacity-50"
              >
                Start Diagnostic (questions only)
              </button>
            </form>
          </>
        )}

        {stock.length > 0 && (
          <Link
            href="/tech/truck"
            className="flex h-12 items-center justify-center rounded-xl border border-sand-300 bg-white text-sm font-medium text-navy-800 active:bg-sand-100"
          >
            Check Truck Stock
          </Link>
        )}

        <div className="mt-2">
          <DeleteJobButton jobId={jobId} />
        </div>
      </div>
    </div>
  );
}
