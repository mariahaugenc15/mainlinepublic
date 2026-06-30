import { requireRole } from "@/lib/guard";
import { getOverviewStats, getAccuracyTrend } from "@/lib/data";

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  await requireRole("ADMIN");
  const stats = getOverviewStats();
  const trend = getAccuracyTrend();

  const recent = trend.slice(-14);
  const maxTotal = Math.max(1, ...recent.map((d) => d.total));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Overview</h1>
      <p className="mb-6 text-sm text-ink-500">Fleet-wide diagnostic performance at a glance</p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Jobs" value={String(stats.totalJobs)} />
        <KpiCard label="Diagnostic Accuracy" value={`${stats.accuracyPct}%`} sub={`${stats.closedCount} closed sessions`} />
        <KpiCard label="Avg. Confidence" value={`${stats.avgConfidence}%`} />
        <KpiCard label="Second Opinions" value={String(stats.secondOpinionCount)} />
        <KpiCard label="Safety-Critical Cases" value={String(stats.safetyCriticalCount)} />
        <KpiCard label="Low Stock Items" value={String(stats.lowStockCount)} />
        <KpiCard label="Active Technicians" value={String(stats.activeTechs)} />
      </div>

      <div className="mt-8 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Jobs Closed — Last 14 Days</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-500">No closed jobs yet.</p>
        ) : (
          <div className="flex items-end gap-2" style={{ height: 160 }}>
            {recent.map((d) => {
              const matchedHeight = (d.matched / maxTotal) * 140;
              const unmatchedHeight = ((d.total - d.matched) / maxTotal) * 140;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                  <div className="flex w-full flex-col justify-end" style={{ height: 140 }}>
                    <div className="w-full rounded-t bg-amber-400" style={{ height: unmatchedHeight }} />
                    <div className="w-full bg-teal-500" style={{ height: matchedHeight }} />
                  </div>
                  <span className="text-[9px] text-ink-500">{d.day.slice(5)}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex gap-4 text-xs text-ink-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal-500" /> Matched</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Redirected</span>
        </div>
      </div>
    </div>
  );
}
