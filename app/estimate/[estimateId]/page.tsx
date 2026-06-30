import { notFound } from "next/navigation";
import { getEstimate } from "@/lib/data";
import { signEstimateAction } from "@/app/estimate/actions";
import SignaturePad from "./_components/SignaturePad";

export default async function PublicEstimatePage({
  params,
  searchParams,
}: {
  params: Promise<{ estimateId: string }>;
  searchParams: Promise<{ signed?: string }>;
}) {
  const { estimateId } = await params;
  const { signed } = await searchParams;
  const estimate = getEstimate(estimateId);
  if (!estimate) notFound();

  const parts = JSON.parse(estimate.parts_json || "[]") as { name: string; qty: number; lineCost: number }[];

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-sand-50 px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 font-bold text-navy-950">D</span>
        <span className="font-semibold text-navy-900">DiagnosticOS — Service Estimate</span>
      </div>

      <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Prepared for</p>
        <h1 className="mt-1 text-xl font-semibold text-navy-900">{estimate.customer_name}</h1>
        <p className="text-sm text-ink-500">{estimate.customer_address}</p>
        <p className="mt-3 rounded-lg bg-sand-100 px-3 py-2 text-sm font-medium text-navy-800">{estimate.job_type}</p>
      </div>

      <div className="mt-4 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
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
            <span className="text-ink-500">Parts</span>
            <span className="text-ink-900">${estimate.parts_cost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-500">Labor ({estimate.labor_hours}h)</span>
            <span className="text-ink-900">${estimate.labor_cost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-500">Service &amp; handling</span>
            <span className="text-ink-900">${estimate.markup_amount.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-sand-200 pt-2 text-lg font-semibold">
            <span className="text-navy-900">Total Estimate</span>
            <span className="text-navy-900">${estimate.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {estimate.status === "signed" ? (
        <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-5 text-sm text-success">
          <p className="font-semibold">Signed and approved</p>
          <p className="mt-1">By {estimate.signature_name} on {estimate.signed_at}</p>
        </div>
      ) : (
        <form action={signEstimateAction.bind(null, estimateId)} className="mt-4 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Approve &amp; Sign</h2>
          <input
            name="signatureName"
            required
            placeholder="Type your full name"
            className="mb-3 h-12 w-full rounded-lg border border-sand-300 px-3 text-base"
          />
          <SignaturePad name="signatureName" />
          <button
            type="submit"
            className="mt-4 flex h-14 w-full items-center justify-center rounded-xl bg-navy-900 text-base font-semibold text-white shadow-sm active:bg-navy-800"
          >
            Approve Estimate
          </button>
          <p className="mt-2 text-center text-xs text-ink-500">By signing you authorize the work and pricing above.</p>
        </form>
      )}

      {signed && <p className="mt-3 text-center text-sm text-success">Thank you — your approval has been received.</p>}
    </div>
  );
}
