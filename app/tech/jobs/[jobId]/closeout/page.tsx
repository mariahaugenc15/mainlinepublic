import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { getSecondOpinionForSession, getSession } from "@/lib/data";
import CloseoutForm from "@/app/tech/_components/CloseoutForm";

export default async function CloseoutPage({
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

  const session = await getSession(sessionId);
  if (!session) notFound();
  const so = await getSecondOpinionForSession(sessionId);
  const parts = JSON.parse(session.parts_recommended_json || "[]");
  const suggestedDiagnosis = so?.status === "redirected" && so.redirected_diagnosis ? so.redirected_diagnosis : session.primary_diagnosis;

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/tech/jobs/${jobId}`} className="mb-4 inline-block text-sm font-medium text-navy-700">&larr; Back to job</Link>
      <h1 className="mb-4 text-xl font-semibold text-navy-900">Close Out Job</h1>
      <CloseoutForm
        jobId={jobId}
        sessionId={sessionId}
        primaryDiagnosis={session.primary_diagnosis}
        suggestedDiagnosis={suggestedDiagnosis}
        parts={parts}
      />
    </div>
  );
}
