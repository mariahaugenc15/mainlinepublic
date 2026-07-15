import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { getJob, listVisionCategories } from "@/lib/data";
import StandalonePhotoCapture from "@/app/tech/_components/StandalonePhotoCapture";

export default async function PhotoDiagnosePage({ params }: { params: Promise<{ jobId: string }> }) {
  await requireRole("TECH");
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) notFound();

  const categories = (await listVisionCategories()).map((c: any) => ({ id: c.id, name: c.name }));

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/tech/jobs/${jobId}`} className="mb-4 inline-block text-sm font-medium text-navy-700">
        &larr; Back to job
      </Link>
      <h1 className="mb-1 text-xl font-semibold text-navy-900">Photo Diagnosis</h1>
      <p className="mb-5 text-sm text-ink-500">
        Capture a photo or short video of the issue — HauGen will match it against the defect database and walk you through the rest of the diagnostic.
      </p>
      <StandalonePhotoCapture jobId={jobId} categories={categories} />
    </div>
  );
}
