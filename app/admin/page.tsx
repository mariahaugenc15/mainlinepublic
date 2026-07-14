import { requireRole } from "@/lib/guard";
import { getOverviewStats, getAccuracyTrend, getRegionalWaterSummary, listRegionalWaterSystems, getLatestIngestionRun } from "@/lib/data";
import { refreshRegionalDataAction } from "@/app/admin/actions";

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ regionalRefresh?: string }>;
}) {
  await requireRole("ADMIN");
  const { regionalRefresh } = await searchParams;
  const [stats, trend, regional, regionalSystems, lastRun] = await Promise.all([
    getOverviewStats(),
    getAccuracyTrend(),
    getRegionalWaterSummary(),
    listRegionalWaterSystems(),
    getLatestIngestionRun(),
  ]);

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

      <div className="mt-8 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Regional Water System Context</h2>
            <p className="mt-1 text-xs text-ink-500">Live EPA SDWIS data for the service area (pilot geography: Michigan)</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <form action={refreshRegionalDataAction}>
              <input type="hidden" name="source" value="bulk_csv" />
              <button type="submit" className="rounded-lg border border-sand-300 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-sand-100">
                Refresh (offline sample)
              </button>
            </form>
            <form action={refreshRegionalDataAction}>
              <input type="hidden" name="source" value="live_api" />
              <button type="submit" className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800">
                Refresh (live EPA API)
              </button>
            </form>
          </div>
        </div>

        {regionalRefresh && (
          <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm font-medium ${
            regionalRefresh === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"
          }`}>
            {regionalRefresh === "success"
              ? "Regional data refreshed successfully."
              : "Refresh failed — see ingestion log below. (The live EPA endpoint may be unreachable from this network.)"}
          </div>
        )}

        {regional?.system_count > 0 ? (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-sand-100 p-3 text-center">
                <p className="text-xl font-bold text-navy-900">{regional.system_count}</p>
                <p className="text-xs text-ink-500">Active water systems</p>
              </div>
              <div className="rounded-lg bg-sand-100 p-3 text-center">
                <p className="text-xl font-bold text-danger">{regional.systems_with_unresolved}</p>
                <p className="text-xs text-ink-500">With unresolved violations</p>
              </div>
              <div className="rounded-lg bg-sand-100 p-3 text-center">
                <p className="text-xl font-bold text-navy-900">{regional.total_violations}</p>
                <p className="text-xs text-ink-500">Total violations on record</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {regionalSystems.slice(0, 6).map((s: any) => (
                <div key={s.pwsid} className="flex items-center justify-between rounded-lg border border-sand-200 px-3 py-2 text-sm">
                  <div>
                    <span className="text-ink-700">{s.pws_name}</span>
                    <span className="ml-2 text-xs text-ink-500">{s.city}, {s.state} · {s.county} County</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.violation_count_unresolved > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                  }`}>
                    {s.violation_count_unresolved > 0 ? `${s.violation_count_unresolved} unresolved` : "No active violations"}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-500">No regional data ingested yet. Use a refresh action above to pull data.</p>
        )}

        {lastRun && (
          <p className="mt-4 text-xs text-ink-500">
            Last ingestion run: {lastRun.source === "live_api" ? "Live EPA API" : "Offline sample CSV"} ·{" "}
            <span className={lastRun.status === "success" ? "text-success" : lastRun.status === "failed" ? "text-danger" : "text-ink-500"}>
              {lastRun.status}
            </span>{" "}
            · {lastRun.rows_pulled} rows · {lastRun.started_at}
            {lastRun.error_message && ` — ${lastRun.error_message}`}
          </p>
        )}
      </div>
    </div>
  );
}
