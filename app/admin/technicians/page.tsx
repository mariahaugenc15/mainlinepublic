import { requireRole } from "@/lib/guard";
import { getTechPerformance, getTechOpenJobForecast } from "@/lib/data";

function fmtMinutes(min: number | null) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function TechniciansPage() {
  await requireRole("ADMIN");
  const [techs, forecast] = await Promise.all([getTechPerformance(), getTechOpenJobForecast()]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Technician Performance</h1>
      <p className="mb-6 text-sm text-ink-500">Diagnostic accuracy, repair times, and open job workload forecast</p>

      {/* Closed-job performance */}
      <div className="mb-8 overflow-x-auto rounded-xl border border-sand-300 bg-white shadow-sm">
        <div className="border-b border-sand-200 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Closed Job Performance</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Technician</th>
              <th className="px-4 py-3">Closed Jobs</th>
              <th className="px-4 py-3">Accuracy</th>
              <th className="px-4 py-3">Avg. Confidence</th>
              <th className="px-4 py-3">Avg. Repair Time</th>
              <th className="px-4 py-3">Range</th>
              <th className="px-4 py-3">Assistance Requested</th>
            </tr>
          </thead>
          <tbody>
            {techs.map((t: any) => {
              const accuracy = t.total_jobs ? Math.round((t.matched_n / t.total_jobs) * 1000) / 10 : 0;
              return (
                <tr key={t.id} className="border-t border-sand-200">
                  <td className="px-4 py-3 font-medium text-ink-900">{t.name}</td>
                  <td className="px-4 py-3 text-ink-700">{t.total_jobs}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${accuracy >= 80 ? "text-success" : accuracy >= 65 ? "text-amber-600" : "text-danger"}`}>
                      {accuracy}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{Math.round(t.avg_confidence)}%</td>
                  <td className="px-4 py-3 text-ink-700">{fmtMinutes(Math.round(t.avg_repair_minutes))}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{fmtMinutes(t.min_repair_minutes)} – {fmtMinutes(t.max_repair_minutes)}</td>
                  <td className="px-4 py-3 text-ink-700">{t.second_opinions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {techs.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No closed jobs yet.</p>}
      </div>

      {/* Open job workload forecast */}
      <div className="rounded-xl border border-sand-300 bg-white shadow-sm">
        <div className="border-b border-sand-200 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Open Job Workload Forecast</h2>
          <p className="mt-0.5 text-xs text-ink-500">Projected time based on diagnostic estimates for in-progress sessions</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Technician</th>
              <th className="px-4 py-3">Open Jobs</th>
              <th className="px-4 py-3">Projected Time Remaining</th>
              <th className="px-4 py-3">Capacity Note</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((f: any) => {
              const projected = f.projected_minutes ? Math.round(f.projected_minutes) : null;
              const capacityNote = !projected
                ? "No active diagnoses yet"
                : projected < 60
                ? "Light workload"
                : projected < 180
                ? "Moderate workload"
                : "Heavy — consider redistributing";
              const capacityColor = !projected
                ? "text-ink-400"
                : projected < 60
                ? "text-success"
                : projected < 180
                ? "text-amber-600"
                : "text-danger";
              return (
                <tr key={f.tech_id} className="border-t border-sand-200">
                  <td className="px-4 py-3 font-medium text-ink-900">{f.tech_name}</td>
                  <td className="px-4 py-3 text-ink-700">{f.open_jobs}</td>
                  <td className="px-4 py-3 text-ink-700">{fmtMinutes(projected)}</td>
                  <td className={`px-4 py-3 text-xs font-medium ${capacityColor}`}>{capacityNote}</td>
                </tr>
              );
            })}
            {forecast.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-ink-500">No open jobs assigned.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
