import Link from "next/link";

export default function UpgradeWall({ status }: { status: "past_due" | "canceled" }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 text-5xl">{status === "past_due" ? "⚠️" : "🔒"}</div>
      <h1 className="mb-2 text-2xl font-semibold text-navy-900">
        {status === "past_due" ? "Payment Past Due" : "Subscription Ended"}
      </h1>
      <p className="mb-6 max-w-sm text-sm text-ink-500">
        {status === "past_due"
          ? "Your last payment didn't go through. Update your payment method to restore full access."
          : "Your HauGen subscription has been canceled. Reactivate to get your team back to diagnosing."}
      </p>
      <Link
        href="/admin/billing"
        className="rounded-xl bg-navy-900 px-6 py-3 text-base font-semibold text-white hover:bg-navy-800"
      >
        {status === "past_due" ? "Update Payment Method" : "Reactivate Subscription"}
      </Link>
    </div>
  );
}
