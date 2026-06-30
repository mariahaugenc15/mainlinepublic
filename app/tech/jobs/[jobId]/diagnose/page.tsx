import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import {
  getBulletin,
  getJob,
  getNode,
  getRegionalContextForAddress,
  getRootNode,
  getSession,
  getTree,
  getTruckForTech,
  getTruckStock,
  listVisionCategories,
} from "@/lib/data";
import { advanceAction, requestSecondOpinionAction } from "@/app/tech/actions";
import { completeSessionWithResult } from "@/lib/data";
import PhotoCapture from "@/app/tech/_components/PhotoCapture";

export default async function DiagnosePage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ session?: string; node?: string }>;
}) {
  const user = await requireRole("TECH");
  const { jobId } = await params;
  const { session: sessionId, node: nodeIdParam } = await searchParams;
  if (!sessionId) notFound();

  const job = getJob(jobId);
  let session = getSession(sessionId);
  if (!job || !session) notFound();

  const tree = getTree(session.tree_id);
  const node = nodeIdParam ? getNode(nodeIdParam) : getRootNode(session.tree_id);
  if (!node) notFound();

  if (node.node_type === "question") {
    const options = JSON.parse(node.options_json || "[]") as { value: string; label: string }[];
    return (
      <div className="mx-auto max-w-lg">
        <BackBar jobId={jobId} treeName={tree.name} />
        <h1 className="mb-4 text-xl font-semibold text-navy-900">{node.prompt_text}</h1>
        <div className="flex flex-col gap-3">
          {options.map((opt) => (
            <form key={opt.value} action={advanceAction}>
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="nodeId" value={node.id} />
              <input type="hidden" name="optionValue" value={opt.value} />
              <button
                type="submit"
                className="flex min-h-14 w-full items-center justify-between rounded-xl border border-sand-300 bg-white px-5 py-4 text-left text-base font-medium text-ink-900 shadow-sm active:bg-sand-100"
              >
                {opt.label}
                <span className="text-ink-500">→</span>
              </button>
            </form>
          ))}
        </div>
      </div>
    );
  }

  if (node.node_type === "photo") {
    const categories = listVisionCategories().map((c: any) => ({ id: c.id, name: c.name }));
    return (
      <div className="mx-auto max-w-lg">
        <BackBar jobId={jobId} treeName={tree.name} />
        <PhotoCapture jobId={jobId} sessionId={sessionId} nodeId={node.id} prompt={node.prompt_text} categories={categories} />
      </div>
    );
  }

  // result node
  if (session.status === "in_progress") {
    const result = JSON.parse(node.result_json);
    completeSessionWithResult(sessionId, result);
    session = getSession(sessionId);
  }

  const secondary = JSON.parse(session.secondary_diagnoses_json || "[]") as { name: string; confidence: number }[];
  const parts = JSON.parse(session.parts_recommended_json || "[]") as { partNumber: string; name: string; qty: number }[];
  const bulletin = getBulletin(node.bulletin_id);
  const truck = getTruckForTech(user.id);
  const stock = truck?.truck_id ? getTruckStock(truck.truck_id) : [];
  const stockByPart = new Map(stock.map((s: any) => [s.part_number, s]));

  const secondOpinionRecommended = session.confidence < 65 || !!session.safety_critical;

  const scaleRelated = /scale|hardness|mineral|sediment/i.test(session.primary_diagnosis || "");
  const regionalContext = scaleRelated ? getRegionalContextForAddress(job.customer_address) : null;

  return (
    <div className="mx-auto max-w-lg">
      <BackBar jobId={jobId} treeName={tree.name} />

      {!!session.safety_critical && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          ⚠ Safety-critical issue — verify before proceeding with repair
        </div>
      )}

      <div className="rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Primary Diagnosis</p>
        <h1 className="mt-1 text-xl font-semibold text-navy-900">{session.primary_diagnosis}</h1>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand-200">
            <div
              className={`h-full rounded-full ${session.confidence >= 80 ? "bg-success" : session.confidence >= 65 ? "bg-amber-500" : "bg-danger"}`}
              style={{ width: `${session.confidence}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-ink-700">{session.confidence}%</span>
        </div>
        <p className="mt-2 text-sm text-ink-500">Est. repair time: {session.est_repair_time_minutes} min</p>
        {bulletin && (
          <div className="mt-3 rounded-lg bg-sand-100 p-3 text-sm text-ink-700">
            <span className="font-semibold text-navy-800">{bulletin.manufacturer_name} {bulletin.bulletin_number}</span> — {bulletin.recommended_fix}
          </div>
        )}
      </div>

      {regionalContext && (
        <div className="mt-4 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 text-sm text-ink-700">
          <span className="font-semibold text-navy-800">Regional water data:</span> {regionalContext.county} County's water
          system ({regionalContext.pws_name}) has {regionalContext.violation_count_unresolved} unresolved water quality
          violation{regionalContext.violation_count_unresolved === 1 ? "" : "s"} on record — consistent with
          hardness/scaling-related issues reported in this service area.
        </div>
      )}

      {secondary.length > 0 && (
        <div className="mt-4 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Secondary Possibilities</h2>
          <ul className="flex flex-col gap-2">
            {secondary.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{s.name}</span>
                <span className="font-medium text-ink-500">{s.confidence}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {parts.length > 0 && (
        <div className="mt-4 rounded-xl border border-sand-300 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Recommended Parts</h2>
          <ul className="flex flex-col gap-2">
            {parts.map((p) => {
              const onTruck = stockByPart.get(p.partNumber);
              const has = onTruck && onTruck.quantity >= p.qty;
              return (
                <li key={p.partNumber} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{p.name} <span className="text-ink-500">×{p.qty}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${has ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                    {has ? "On truck" : "Not stocked"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {!session.second_opinion_requested && secondOpinionRecommended && (
          <form action={requestSecondOpinionAction.bind(null, jobId, sessionId)}>
            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center rounded-xl bg-amber-500 text-base font-semibold text-navy-950 shadow-sm active:bg-amber-600"
            >
              Request Second Opinion
            </button>
          </form>
        )}
        {session.second_opinion_requested ? (
          <Link
            href={`/tech/jobs/${jobId}/second-opinion?session=${sessionId}`}
            className="flex h-12 items-center justify-center rounded-xl border border-sand-300 bg-white text-sm font-medium text-navy-800 active:bg-sand-100"
          >
            View Second Opinion Status
          </Link>
        ) : (
          <Link
            href={`/tech/jobs/${jobId}/closeout?session=${sessionId}`}
            className="flex h-12 items-center justify-center rounded-xl border border-sand-300 bg-white text-sm font-medium text-navy-800 active:bg-sand-100"
          >
            {secondOpinionRecommended ? "Skip — Continue to Close-Out" : "Continue to Close-Out"}
          </Link>
        )}
      </div>
    </div>
  );
}

function BackBar({ jobId, treeName }: { jobId: string; treeName: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link href={`/tech/jobs/${jobId}`} className="text-sm font-medium text-navy-700">&larr; {treeName}</Link>
    </div>
  );
}
