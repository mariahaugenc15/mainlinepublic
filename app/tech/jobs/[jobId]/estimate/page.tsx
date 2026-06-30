import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { getEstimate, getJob } from "@/lib/data";
import { sendEstimateAction } from "@/app/tech/actions";

export default async function TechEstimatePage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ estimate?: string }>;
}) {
  await requireRole("TECH");
  const { jobId } = await params;
  const { estimate: estimateId } = await searchParams;
  if (!estimateId) notFound();

  const job = getJob(jobId);
  const estimate = getEstimate(estimateId);
  if (!job || !estimate) notFound();

  const parts = JSON.parse(estimate.parts_json || "[]") as { name: string; qty: number; unitCost: number; lineCost: number }[];

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/tech/jobs/${jobId}`} className="mb-3 inline-block text-sm font-medium text-navy-700">&larr; Back to job</Link>
      <h1 className="mb-1 text-xl font-semibold text-navy-900">Estimate</h1>
      <p className="mb-4 text-sm text-ink-500">{estimate.customer_name} · {estimate.job_type}</p>

      <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        {parts.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Parts</p>
            <ul className="flex flex-col gap-1.5">
              {parts.map((p) => (
                <li key={p.name} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{p.name} ×{p.qty}</span>
                  <span className="font-medium text-ink-900">${p.lineCost.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-1.5 border-t border-sand-200 pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-500">Parts subtotal</span>
            <span className="text-ink-900">${estimate.parts_cost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-500">Labor ({estimate.labor_hours}h @ ${estimate.labor_rate.toFixed(2)}/hr)</span>
            <span className="text-ink-900">${estimate.labor_cost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-500">Markup ({estimate.markup_pct}%)</span>
            <span className="text-ink-900">${estimate.markup_amount.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-sand-200 pt-2 text-base font-semibold">
            <span className="text-navy-900">Total</span>
            <span className="text-navy-900">${estimate.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-sand-100 px-3 py-2 text-xs text-ink-500">
        Status: <span className="font-semibold uppercase">{estimate.status}</span>
      </div>

      {estimate.status === "draft" && (
        <form action={sendEstimateAction.bind(null, jobId, estimateId)} className="mt-4">
          <button
            type="submit"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-navy-900 text-base font-semibold text-white shadow-sm active:bg-navy-800"
          >
            Send to Customer
          </button>
        </form>
      )}

      {estimate.status !== "draft" && (
        <div className="mt-4 rounded-xl border border-sand-300 bg-white p-4 text-sm">
          <p className="mb-1 font-semibold text-navy-800">Customer link</p>
          <p className="break-all text-teal-700">/estimate/{estimateId}</p>
          {estimate.status === "signed" && (
            <p className="mt-2 text-xs text-success">Signed by {estimate.signature_name} on {estimate.signed_at}</p>
          )}
        </div>
      )}
    </div>
  );
}
