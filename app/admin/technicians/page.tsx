import { requireRole } from "@/lib/guard";
import { getTechPerformance } from "@/lib/data";

export default async function TechniciansPage() {
  await requireRole("ADMIN");
  const techs = await getTechPerformance();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Technician Performance</h1>
      <p className="mb-6 text-sm text-ink-500">Closed-job accuracy and diagnostic confidence by technician</p>

      <div className="overflow-x-auto rounded-xl border border-sand-300 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Technician</th>
              <th className="px-4 py-3">Closed Jobs</th>
              <th className="px-4 py-3">Accuracy</th>
              <th className="px-4 py-3">Avg. Confidence</th>
              <th className="px-4 py-3">Second Opinions</th>
            </tr>
          </thead>
          <tbody>
            {techs.map((t: any) => {
              const accuracy = t.total_jobs ? Math.round((t.matched_n / t.total_jobs) * 1000) / 10 : 0;
              return (
                <tr key={t.id} className="border-t border-sand-200">
                  <td className="px-4 py-3 font-medium text-ink-900">{t.name}</td>
                  <td className="px-4 py-3 text-ink-700">{t.total_jobs}</td>
                  <td className="px-4 py-3 text-ink-700">{accuracy}%</td>
                  <td className="px-4 py-3 text-ink-700">{Math.round(t.avg_confidence)}%</td>
                  <td className="px-4 py-3 text-ink-700">{t.second_opinions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {techs.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No closed jobs yet.</p>}
      </div>
    </div>
  );
}
