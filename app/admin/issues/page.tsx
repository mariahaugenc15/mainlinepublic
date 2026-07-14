import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { getIssueTypeBreakdown, getIssueTypeDetail, listTrees } from "@/lib/data";

export default async function IssuesPage({ searchParams }: { searchParams: Promise<{ tree?: string }> }) {
  await requireRole("ADMIN");
  const { tree } = await searchParams;
  const [breakdown, trees] = await Promise.all([getIssueTypeBreakdown(), listTrees()]);
  const selectedTree = tree ? trees.find((t: any) => t.id === tree) : undefined;
  const detail = tree ? await getIssueTypeDetail(tree) : [];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Issue Type Breakdown</h1>
      <p className="mb-6 text-sm text-ink-500">Diagnostic volume and accuracy by equipment issue category</p>

      <div className="overflow-x-auto rounded-xl border border-sand-300 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Issue Type</th>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Jobs</th>
              <th className="px-4 py-3">Accuracy</th>
              <th className="px-4 py-3">Avg. Confidence</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b: any) => {
              const accuracy = b.n ? Math.round((b.matched_n / b.n) * 1000) / 10 : 0;
              return (
                <tr key={b.tree_name} className={`border-t border-sand-200 ${selectedTree?.name === b.tree_name ? "bg-sand-100" : ""}`}>
                  <td className="px-4 py-3 font-medium text-ink-900">{b.tree_name}</td>
                  <td className="px-4 py-3 text-ink-700">{b.equipment_type}</td>
                  <td className="px-4 py-3 text-ink-700">{b.n}</td>
                  <td className="px-4 py-3 text-ink-700">{accuracy}%</td>
                  <td className="px-4 py-3 text-ink-700">{Math.round(b.avg_confidence)}%</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/issues?tree=${trees.find((t: any) => t.name === b.tree_name)?.id}`} className="text-sm font-semibold text-teal-700 hover:underline">
                      Drill down →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tree && (
        <div className="mt-8 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-navy-900">{selectedTree?.name ?? "Detail"}</h2>
          <p className="mb-4 text-sm text-ink-500">Diagnosis breakdown within this issue type</p>
          <div className="flex flex-col gap-2">
            {detail.map((d: any) => {
              const accuracy = d.n ? Math.round((d.matched_n / d.n) * 1000) / 10 : 0;
              return (
                <div key={d.primary_diagnosis} className="flex items-center justify-between rounded-lg border border-sand-200 px-4 py-3 text-sm">
                  <span className="text-ink-700">{d.primary_diagnosis}</span>
                  <span className="text-ink-500">{d.n} job{d.n === 1 ? "" : "s"} · {accuracy}% accuracy · {Math.round(d.avg_confidence)}% avg confidence</span>
                </div>
              );
            })}
            {detail.length === 0 && <p className="text-sm text-ink-500">No closed sessions for this issue type yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
