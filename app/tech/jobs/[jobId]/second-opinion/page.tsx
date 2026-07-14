import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { getSecondOpinionForSession, getSession } from "@/lib/data";
import SecondOpinionWaiting from "@/app/tech/_components/SecondOpinionWaiting";

export default async function SecondOpinionPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  await requireRole("TECH");
  const { jobId } = await params;
  const { session: sessionId } = await searchParams;
  if (!sessionId) notFound();

  const [session, so] = await Promise.all([getSession(sessionId), getSecondOpinionForSession(sessionId)]);
  if (!session || !so) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/tech/jobs/${jobId}`} className="mb-4 inline-block text-sm font-medium text-navy-700">&larr; Back to job</Link>

      <div className="mb-4 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Second Opinion Requested</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-base font-semibold text-amber-500">
            {so.reviewer_name.split(" ").map((n: string) => n[0]).join("")}
          </div>
          <div>
            <p className="text-base font-semibold text-navy-900">{so.reviewer_name}</p>
            <p className="text-xs text-ink-500">{so.reviewer_credential} · {so.reviewer_years} yrs experience</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-sand-100 px-3 py-2 text-sm text-ink-700">
          Case sent: <span className="font-medium">{session.primary_diagnosis}</span> ({session.confidence}% confidence)
        </div>
      </div>

      {so.status === "pending" ? (
        <SecondOpinionWaiting soId={so.id} />
      ) : (
        <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              so.status === "confirmed" ? "bg-success/10 text-success" : "bg-amber-100 text-amber-600"
            }`}
          >
            {so.status === "confirmed" ? "Diagnosis Confirmed" : "Diagnosis Redirected"}
          </span>
          <p className="mt-3 text-sm text-ink-700">{so.reviewer_notes}</p>
          {so.status === "redirected" && so.redirected_diagnosis && (
            <div className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-600">
              Revised diagnosis: {so.redirected_diagnosis}
            </div>
          )}
          <Link
            href={`/tech/jobs/${jobId}/closeout?session=${sessionId}`}
            className="mt-5 flex h-14 items-center justify-center rounded-xl bg-navy-900 text-base font-semibold text-white active:bg-navy-800"
          >
            Continue to Close-Out
          </Link>
        </div>
      )}
    </div>
  );
}
