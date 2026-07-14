import { requireRole } from "@/lib/guard";
import { listPendingReviewsForReviewer, listReviewHistoryForReviewer } from "@/lib/data";
import { respondToCaseAction } from "@/app/review/actions";

export default async function ReviewQueuePage({ searchParams }: { searchParams: Promise<{ responded?: string }> }) {
  const user = await requireRole("REVIEWER");
  const { responded } = await searchParams;
  const [pending, history] = await Promise.all([
    listPendingReviewsForReviewer(user.id),
    listReviewHistoryForReviewer(user.id),
  ]);

  return (
    <div>
      {responded && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Response sent to the field technician.
        </div>
      )}

      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Pending Review Requests</h1>
      <p className="mb-6 text-sm text-ink-500">{pending.length} case{pending.length === 1 ? "" : "s"} awaiting your review</p>

      {pending.length === 0 && (
        <div className="rounded-xl border border-dashed border-sand-300 bg-white p-10 text-center text-ink-500">
          No pending cases right now.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {pending.map((c: any) => {
          const secondary = JSON.parse(c.secondary_diagnoses_json || "[]");
          return (
            <div key={c.id} className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-navy-900">{c.customer_name}</p>
                  <p className="text-sm text-ink-500">{c.job_type} · Tech: {c.tech_name}</p>
                </div>
                {!!c.safety_critical && (
                  <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">Safety-Critical</span>
                )}
              </div>

              <div className="mt-3 rounded-lg bg-sand-100 p-3">
                <p className="text-sm font-semibold text-navy-800">{c.primary_diagnosis} — {c.confidence}% confidence</p>
                {secondary.length > 0 && (
                  <p className="mt-1 text-xs text-ink-500">
                    Alt: {secondary.map((s: any) => `${s.name} (${s.confidence}%)`).join(", ")}
                  </p>
                )}
              </div>

              <form action={respondToCaseAction} className="mt-4 flex flex-col gap-2">
                <input type="hidden" name="soId" value={c.id} />
                <textarea
                  name="notes"
                  placeholder="Review notes…"
                  defaultValue="Reviewed field photos and diagnostic path — consistent with reported symptoms."
                  className="w-full rounded-lg border border-sand-300 px-3 py-2 text-sm outline-none focus:border-navy-600"
                  rows={2}
                />
                <input type="hidden" name="redirectedDiagnosis" value={secondary[0]?.name ?? ""} />
                <div className="flex gap-2">
                  <button
                    name="decision"
                    value="confirmed"
                    className="flex-1 rounded-lg bg-success px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Confirm Diagnosis
                  </button>
                  <button
                    name="decision"
                    value="redirected"
                    className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-navy-950 hover:bg-amber-600"
                  >
                    Redirect Diagnosis
                  </button>
                </div>
              </form>
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-navy-900">Recent Reviews</h2>
          <div className="flex flex-col gap-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-sand-200 bg-white px-4 py-3 text-sm">
                <span className="text-ink-700">{h.customer_name} — {h.primary_diagnosis}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${h.status === "confirmed" ? "bg-success/10 text-success" : "bg-amber-100 text-amber-600"}`}>
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
