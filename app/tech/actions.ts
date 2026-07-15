"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guard";
import {
  appendPathStep,
  cancelSession,
  closeJob,
  createEstimate,
  createIntakeJob,
  createSession,
  getChildNode,
  getCompanySettings,
  getJob,
  getSecondOpinion,
  getSession,
  getSessionForJob,
  getTreeIdForEquipmentType,
  getUserHourlyRate,
  markEstimateSent,
  recordPhotoAnalysis,
  requestRestock,
  requestSecondOpinion,
  resolveSecondOpinion,
  setJobStatus,
} from "@/lib/data";

export async function startDiagnosticAction(jobId: string) {
  const user = await requireRole("TECH");
  const job = await getJob(jobId);
  const treeId = getTreeIdForEquipmentType(job.equipment_type) ?? "tree_gwh";
  const sessionId = await createSession(jobId, treeId, user.id);
  redirect(`/tech/jobs/${jobId}/diagnose?session=${sessionId}`);
}

export async function advanceAction(formData: FormData) {
  await requireRole("TECH");
  const jobId = String(formData.get("jobId"));
  const sessionId = String(formData.get("sessionId"));
  const nodeId = String(formData.get("nodeId"));
  const optionValue = String(formData.get("optionValue"));

  await appendPathStep(sessionId, optionValue);
  const child = await getChildNode(nodeId, optionValue);
  if (!child) {
    redirect(`/tech/jobs/${jobId}/diagnose?session=${sessionId}&node=${nodeId}`);
  }
  redirect(`/tech/jobs/${jobId}/diagnose?session=${sessionId}&node=${child.id}`);
}

export async function submitPhotoAction(formData: FormData) {
  await requireRole("TECH");
  const jobId = String(formData.get("jobId"));
  const sessionId = String(formData.get("sessionId"));
  const nodeId = String(formData.get("nodeId"));
  const categoryId = String(formData.get("categoryId"));
  const confidence = Number(formData.get("confidence"));

  await recordPhotoAnalysis(sessionId, nodeId, categoryId, confidence);
  await appendPathStep(sessionId, "_continue");
  const child = await getChildNode(nodeId, "_continue");
  redirect(`/tech/jobs/${jobId}/diagnose?session=${sessionId}&node=${child?.id ?? nodeId}`);
}

export async function requestSecondOpinionAction(jobId: string, sessionId: string) {
  await requireRole("TECH");
  await requestSecondOpinion(sessionId);
  redirect(`/tech/jobs/${jobId}/second-opinion?session=${sessionId}`);
}

export async function resolveSecondOpinionAction(soId: string) {
  const so = await getSecondOpinion(soId);
  if (so.status !== "pending") return;
  const confirmRoll = Math.random() < 0.8;
  if (confirmRoll) {
    await resolveSecondOpinion(soId, "confirmed", "Reviewed field notes and photos — consistent with reported symptoms. Diagnosis confirmed, proceed with repair.");
  } else {
    const session = await getSession(so.session_id);
    const secondary = JSON.parse(session.secondary_diagnoses_json || "[]");
    await resolveSecondOpinion(
      soId,
      "redirected",
      "Field readings suggest an alternate root cause based on similar cases. Recommend revising diagnosis before ordering parts.",
      secondary[0]?.name
    );
  }
}

export async function skipSecondOpinionAction(jobId: string, sessionId: string) {
  await requireRole("TECH");
  redirect(`/tech/jobs/${jobId}/closeout?session=${sessionId}`);
}

export async function closeJobAction(formData: FormData) {
  const user = await requireRole("TECH");
  const jobId = String(formData.get("jobId"));
  const sessionId = String(formData.get("sessionId"));
  const actualDiagnosis = String(formData.get("actualDiagnosis"));
  const matched = formData.get("matched") === "true";
  const partsJson = String(formData.get("partsUsed") || "[]");
  const partsUsed = JSON.parse(partsJson);

  await closeJob(jobId, sessionId, user.id, actualDiagnosis, matched, partsUsed);
  redirect(`/tech?closed=${jobId}`);
}

export async function requestRestockAction(formData: FormData) {
  const user = await requireRole("TECH");
  const truckId = String(formData.get("truckId"));
  const partId = String(formData.get("partId"));
  await requestRestock(truckId, partId, user.id);
  redirect(`/tech/truck?requested=${partId}`);
}

export async function startPhotoAction(formData: FormData) {
  const user = await requireRole("TECH");
  const jobId = String(formData.get("jobId"));
  const categoryId = String(formData.get("categoryId"));
  const confidence = Number(formData.get("confidence"));

  const job = await getJob(jobId);
  const treeId = getTreeIdForEquipmentType(job.equipment_type) ?? "tree_gwh";
  const sessionId = await createSession(jobId, treeId, user.id);
  // Record photo analysis before tree navigation begins
  await recordPhotoAnalysis(sessionId, null, categoryId, confidence);
  redirect(`/tech/jobs/${jobId}/diagnose?session=${sessionId}`);
}

export async function cancelJobDiagnosticAction(jobId: string) {
  await requireRole("TECH");
  const session = await getSessionForJob(jobId);
  if (session) await cancelSession(session.id);
  await setJobStatus(jobId, "scheduled");
  redirect(`/tech/jobs/${jobId}`);
}

export async function createOnSiteCallAction(formData: FormData) {
  const user = await requireRole("TECH");
  const { jobId } = await createIntakeJob({
    customerName: String(formData.get("customerName")),
    address: String(formData.get("address")),
    phone: String(formData.get("phone") || ""),
    equipmentType: String(formData.get("equipmentType")),
    equipmentMake: String(formData.get("equipmentMake") || ""),
    equipmentModel: String(formData.get("equipmentModel") || ""),
    jobType: String(formData.get("jobType")),
    notes: String(formData.get("notes") || ""),
    techId: user.id,
    scheduledAt: new Date().toISOString(),
    status: "in_progress",
    source: "tech",
  });
  redirect(`/tech/jobs/${jobId}`);
}

export async function generateEstimateAction(jobId: string, sessionId: string) {
  const user = await requireRole("TECH");
  const [session, laborRate, settings] = await Promise.all([
    getSession(sessionId),
    getUserHourlyRate(user.id),
    getCompanySettings(),
  ]);
  const parts = JSON.parse(session.parts_recommended_json || "[]") as { partNumber: string; name: string; qty: number }[];
  const laborHours = Math.round(((session.est_repair_time_minutes || 0) / 60) * 100) / 100;
  const markupPct = settings.default_markup_pct;

  const estimateId = await createEstimate({
    jobId,
    sessionId,
    createdBy: user.id,
    parts,
    laborHours,
    laborRate,
    markupPct,
  });

  redirect(`/tech/jobs/${jobId}/estimate?estimate=${estimateId}`);
}

export async function sendEstimateAction(jobId: string, estimateId: string) {
  await requireRole("TECH");
  await markEstimateSent(estimateId);
  redirect(`/tech/jobs/${jobId}/estimate?estimate=${estimateId}`);
}
