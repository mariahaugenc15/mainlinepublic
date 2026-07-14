import { requireRole } from "@/lib/guard";
import { listClosedSessions, listTechsForFilter } from "@/lib/data";

export default async function AccuracyPage({
  searchParams,
}: {
  searchParams: Promise<{ techId?: string; matched?: string; minConfidence?: string }>;
}) {
  await requireRole("ADMIN");
  const filters = await searchParams;
  const [sessions, techs] = await Promise.all([
    listClosedSessions(filters),
    listTechsForFilter(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Diagnostic Accuracy</h1>
      <p className="mb-6 text-sm text-ink-500">{sessions.length} closed session{sessions.length === 1 ? "" : "s"}</p>

      <form className="mb-5 flex flex-wrap gap-3 rounded-xl border border-sand-300 bg-white p-4 shadow-sm" method="get">
        <select name="techId" defaultValue={filters.techId ?? ""} className="rounded-lg border border-sand-300 px-3 py-2 text-sm">
          <option value="">All technicians</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select name="matched" defaultValue={filters.matched ?? ""} className="rounded-lg border border-sand-300 px-3 py-2 text-sm">
          <option value="">Matched or redirected</option>
          <option value="true">Matched only</option>
          <option value="false">Redirected only</option>
        </select>
        <select name="minConfidence" defaultValue={filters.minConfidence ?? ""} className="rounded-lg border border-sand-300 px-3 py-2 text-sm">
          <option value="">Any confidence</option>
          <option value="80">80%+</option>
          <option value="65">65%+</option>
          <option value="50">50%+</option>
        </select>
        <button type="submit" className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
          Apply Filters
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-sand-300 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Technician</th>
              <th className="px-4 py-3">AI Diagnosis</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Actual Diagnosis</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Closed</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.session_id} className="border-t border-sand-200">
                <td className="px-4 py-3 text-ink-900">{s.customer_name}</td>
                <td className="px-4 py-3 text-ink-700">{s.tech_name}</td>
                <td className="px-4 py-3 text-ink-700">{s.primary_diagnosis}</td>
                <td className="px-4 py-3 text-ink-700">{s.confidence}%</td>
                <td className="px-4 py-3 text-ink-700">{s.actual_diagnosis}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.matched ? "bg-success/10 text-success" : "bg-amber-100 text-amber-600"}`}>
                    {s.matched ? "Matched" : "Redirected"}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-500">{s.closed_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No sessions match these filters.</p>}
      </div>
    </div>
  );
}
