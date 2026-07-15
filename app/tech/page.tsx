import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { listJobsForTech, listCompletedJobsForTech } from "@/lib/data";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function TechJobQueue({ searchParams }: { searchParams: Promise<{ closed?: string }> }) {
  const user = await requireRole("TECH");
  const { closed } = await searchParams;
  const [jobs, completedJobs] = await Promise.all([
    listJobsForTech(user.id),
    listCompletedJobsForTech(user.id),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy-900">Today's Jobs</h1>
        <Link
          href="/tech/new-call"
          className="rounded-lg bg-navy-900 px-3 py-1.5 text-sm font-semibold text-white active:bg-navy-800"
        >
          + New Call
        </Link>
      </div>
      <p className="mb-4 text-sm text-ink-500">{jobs.length} job{jobs.length === 1 ? "" : "s"} assigned</p>

      {closed && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Job closed out and saved to company records.
        </div>
      )}

      {jobs.length === 0 && (
        <div className="rounded-xl border border-dashed border-sand-300 bg-white p-8 text-center text-ink-500">
          No jobs in your queue right now.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {jobs.map((j) => (
          <Link
            key={j.id}
            href={`/tech/jobs/${j.id}`}
            className="block rounded-xl border border-sand-300 bg-white p-4 shadow-sm active:bg-sand-100"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-navy-900">{j.customer_name}</p>
                <p className="text-sm text-ink-500">{j.customer_address}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  j.status === "in_progress" ? "bg-amber-100 text-amber-600" : "bg-sand-200 text-ink-700"
                }`}
              >
                {j.status === "in_progress" ? "In Progress" : formatTime(j.scheduled_at)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md bg-navy-900/5 px-2 py-1 font-medium text-navy-800">{j.job_type}</span>
              {j.equipment_make && (
                <span className="text-ink-500">
                  {j.equipment_make} {j.equipment_model} {j.equipment_install_year ? `· ${j.equipment_install_year}` : ""}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {completedJobs.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-base font-semibold text-navy-900">Completed Jobs</h2>
          <div className="flex flex-col gap-2">
            {completedJobs.map((j) => (
              <Link
                key={j.id}
                href={`/tech/jobs/${j.id}`}
                className="block rounded-xl border border-sand-200 bg-white p-4 shadow-sm active:bg-sand-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{j.customer_name}</p>
                    <p className="text-xs text-ink-500">{j.customer_address}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-400">{j.closed_at ? formatDate(j.closed_at) : ""}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-navy-900/5 px-2 py-0.5 font-medium text-navy-800">{j.job_type}</span>
                  {j.actual_diagnosis && (
                    <span className="text-ink-500 truncate max-w-[200px]">{j.actual_diagnosis}</span>
                  )}
                  {j.matched !== null && j.matched !== undefined && (
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${j.matched ? "bg-success/10 text-success" : "bg-amber-100 text-amber-700"}`}>
                      {j.matched ? "AI accurate" : "AI corrected"}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
