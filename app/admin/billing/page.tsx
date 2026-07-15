import { requireRole } from "@/lib/guard";
import { getBillingState, PLAN_CONFIG, planBadgeClass, statusBadgeClass } from "@/lib/billing";
import type { PlanTier, BillingStatus } from "@/lib/billing";

export default async function BillingPage() {
  await requireRole("ADMIN");
  const billing = await getBillingState();
  const plan = PLAN_CONFIG[billing.plan];
  const seatUtil = billing.seatCount > 0 ? Math.round((billing.activeSeats / billing.seatCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Billing</h1>
          <p className="text-sm text-ink-500">Manage your plan, seats, and payment history</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${planBadgeClass(billing.plan)}`}>
            {plan.name}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClass(billing.status)}`}>
            {billing.status === "trialing" ? "Trial" : billing.status === "active" ? "Active" : billing.status === "past_due" ? "Past Due" : "Canceled"}
          </span>
        </div>
      </div>

      {/* Plan card */}
      <div className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Current Plan</p>
            <h2 className="mt-1 text-xl font-semibold text-navy-900">{plan.name}</h2>
            <p className="mt-1 text-sm text-ink-500">
              ${plan.pricePerSeat}/technician/month · {billing.seatCount} seat{billing.seatCount !== 1 ? "s" : ""} · ${billing.projectedMonthlyTotal.toFixed(2)}/mo projected
            </p>
          </div>
          <a
            href="mailto:billing@haugen.app"
            className="rounded-lg border border-sand-300 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-sand-50"
          >
            Manage Plan
          </a>
        </div>

        {billing.trialEndsAt && billing.status === "trialing" && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Trial ends {new Date(billing.trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Add a payment method to continue without interruption.
          </div>
        )}

        <div className="mt-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Included Features</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {plan.features.map((f) => (
              <span key={f} className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-medium text-ink-700 capitalize">
                {f.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Seat usage */}
      <div className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Seat Usage</p>
        <div className="mt-3 flex items-end gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-ink-700 font-medium">{billing.activeSeats} active technician{billing.activeSeats !== 1 ? "s" : ""}</span>
              <span className="text-ink-500">{billing.seatCount} seats licensed</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-sand-200">
              <div
                className={`h-full rounded-full transition-all ${seatUtil >= 100 ? "bg-danger" : seatUtil >= 80 ? "bg-amber-500" : "bg-teal-500"}`}
                style={{ width: `${Math.min(seatUtil, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-500">{seatUtil}% of seats in use</p>
          </div>
        </div>
        {seatUtil >= 100 && (
          <p className="mt-3 text-sm text-danger font-medium">All seats are in use. Contact us to add more seats.</p>
        )}

        {/* Bar chart: seat usage by month (mock 3 months) */}
        <div className="mt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Monthly Active Seats</p>
          <div className="flex items-end gap-4 h-20">
            {[
              { month: "May", seats: 4 },
              { month: "Jun", seats: 5 },
              { month: "Jul", seats: billing.activeSeats },
            ].map(({ month, seats }) => {
              const pct = (seats / (billing.seatCount || 1)) * 100;
              return (
                <div key={month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-navy-800">{seats}</span>
                  <div className="w-full rounded-t" style={{ height: `${Math.max(pct, 8)}%`, backgroundColor: "rgb(20 184 166 / 0.6)" }} />
                  <span className="text-xs text-ink-500">{month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Payment Method</p>
          <a
            href="mailto:billing@haugen.app"
            className="text-sm font-medium text-navy-700 hover:underline"
          >
            Update
          </a>
        </div>
        {billing.stripeCustomerId ? (
          <p className="mt-2 text-sm text-ink-700">Managed via Stripe — contact billing@haugen.app to update card details.</p>
        ) : (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-dashed border-sand-300 px-4 py-3">
            <span className="text-2xl">💳</span>
            <div>
              <p className="text-sm font-medium text-ink-700">No payment method on file</p>
              <p className="text-xs text-ink-500">Add a card to activate billing after your trial ends.</p>
            </div>
          </div>
        )}
      </div>

      {/* Billing history */}
      <div className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-4">Billing History</p>
        {billing.history.length === 0 ? (
          <p className="text-sm text-ink-500">No billing history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200">
                  <th className="pb-2 text-left font-semibold text-ink-500 text-xs uppercase tracking-wide">Date</th>
                  <th className="pb-2 text-left font-semibold text-ink-500 text-xs uppercase tracking-wide">Description</th>
                  <th className="pb-2 text-right font-semibold text-ink-500 text-xs uppercase tracking-wide">Amount</th>
                  <th className="pb-2 text-right font-semibold text-ink-500 text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {billing.history.map((evt, i) => (
                  <tr key={i}>
                    <td className="py-3 text-ink-500">{evt.date}</td>
                    <td className="py-3 text-ink-700">{evt.description}</td>
                    <td className="py-3 text-right font-medium text-ink-900 tabular-nums">${evt.amount.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                        evt.status === "paid" ? "bg-success/10 text-success" :
                        evt.status === "pending" ? "bg-amber-100 text-amber-700" :
                        "bg-danger/10 text-danger"
                      }`}>
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div className="rounded-xl border border-sand-300 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-4">Plan Comparison</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Feature</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-500">Starter<br /><span className="font-normal normal-case">$75/tech</span></th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-teal-700">Professional<br /><span className="font-normal normal-case">$100/tech</span></th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-500">Enterprise<br /><span className="font-normal normal-case">$125/tech</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {[
                { label: "Diagnostic Trees", starter: true, pro: true, ent: true },
                { label: "Photo Capture", starter: true, pro: true, ent: true },
                { label: "Estimates", starter: true, pro: true, ent: true },
                { label: "Second Opinions", starter: false, pro: true, ent: true },
                { label: "Procurement & Stock", starter: false, pro: true, ent: true },
                { label: "Accuracy Reports", starter: false, pro: true, ent: true },
                { label: "Review Board", starter: false, pro: false, ent: true },
                { label: "API Access", starter: false, pro: false, ent: true },
                { label: "SSO", starter: false, pro: false, ent: true },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="py-2.5 text-ink-700">{row.label}</td>
                  <td className="py-2.5 text-center">{row.starter ? "✓" : <span className="text-ink-300">—</span>}</td>
                  <td className="py-2.5 text-center font-medium text-teal-700">{row.pro ? "✓" : <span className="text-ink-300">—</span>}</td>
                  <td className="py-2.5 text-center">{row.ent ? "✓" : <span className="text-ink-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-500">To change plans or discuss volume pricing, contact <a href="mailto:billing@haugen.app" className="underline">billing@haugen.app</a>.</p>
      </div>
    </div>
  );
}
