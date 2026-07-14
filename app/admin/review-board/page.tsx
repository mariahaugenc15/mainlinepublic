import { requireRole } from "@/lib/guard";
import { listReviewers } from "@/lib/data";

export default async function ReviewBoardPage() {
  await requireRole("ADMIN");
  const reviewers = await listReviewers();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Diagnostic Review Board</h1>
      <p className="mb-6 text-sm text-ink-500">Licensed reviewers available for second-opinion escalations</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviewers.map((r: any) => (
          <div key={r.id} className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/15 text-sm font-semibold text-teal-700">
                {r.name.split(" ").map((n: string) => n[0]).join("")}
              </span>
              <div>
                <p className="text-sm font-semibold text-navy-900">{r.name}</p>
                <p className="text-xs text-ink-500">{r.credential} · {r.years_experience} yrs experience</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Total reviews</span>
              <span className="font-medium text-ink-900">{r.total_reviews}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Pending</span>
              <span className={`font-medium ${r.pending_reviews > 0 ? "text-amber-600" : "text-ink-900"}`}>{r.pending_reviews}</span>
            </div>
          </div>
        ))}
        {reviewers.length === 0 && <p className="text-sm text-ink-500">No reviewers on roster.</p>}
      </div>
    </div>
  );
}
