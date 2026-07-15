import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { logoutAction } from "@/app/actions";
import Brand from "@/app/_components/Brand";
import { getBillingState } from "@/lib/billing";

const NAV: ({ href: string; label: string } | null)[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/intake", label: "Job Queue" },
  { href: "/admin/accuracy", label: "Diagnostic Accuracy" },
  { href: "/admin/issues", label: "Issue Breakdown" },
  { href: "/admin/calibration", label: "Confidence Calibration" },
  { href: "/admin/technicians", label: "Technician Performance" },
  { href: "/admin/procurement", label: "Procurement & Stock" },
  { href: "/admin/manufacturers", label: "Manufacturer Library" },
  { href: "/admin/review-board", label: "Review Board" },
  null,
  { href: "/admin/company", label: "Company Profile" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/billing", label: "Billing" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  const billing = await getBillingState();
  const showTrialBanner = billing.status === "trialing" && billing.trialEndsAt;
  const showPastDueBanner = billing.status === "past_due";

  return (
    <div className="flex min-h-screen bg-sand-50">
      <aside className="flex w-64 shrink-0 flex-col bg-navy-950 text-white">
        <div className="px-5 py-5">
          <Brand size="sm" light />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV.map((item, i) =>
            item === null ? (
              <div key={`divider-${i}`} className="my-1 border-t border-white/10" />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-sand-200 hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-sm text-sand-200">{user.name}</p>
          <p className="mb-3 text-xs text-sand-400">Admin</p>
          <form action={logoutAction}>
            <button className="w-full rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">Log out</button>
          </form>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {showTrialBanner && (
          <div className="flex items-center justify-between bg-amber-500 px-6 py-2 text-sm font-medium text-navy-950">
            <span>Trial ends {new Date(billing.trialEndsAt!).toLocaleDateString("en-US", { month: "long", day: "numeric" })} — add a payment method to keep access.</span>
            <Link href="/admin/billing" className="rounded bg-navy-950/10 px-3 py-1 text-xs font-semibold hover:bg-navy-950/20">Manage Billing</Link>
          </div>
        )}
        {showPastDueBanner && (
          <div className="flex items-center justify-between bg-danger px-6 py-2 text-sm font-medium text-white">
            <span>Your payment is past due — some features may be restricted.</span>
            <Link href="/admin/billing" className="rounded bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20">Update Payment</Link>
          </div>
        )}
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
