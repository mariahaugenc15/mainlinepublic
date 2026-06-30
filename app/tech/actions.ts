"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guard";
import {
  appendPathStep,
  closeJob,
  createEstimate,
  createIntakeJob,
  createSession,
  getChildNode,
  getCompanySettings,
  getJob,
  getSecondOpinion,
  getSession,
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
  const job = getJob(jobId);
  const treeId = getTreeIdForEquipmentType(job.equipment_type) ?? "tree_gwh";
  const sessionId = createSession(jobId, treeId, user.id);
  redirect(`/tech/jobs/${jobId}/diagnose?session=${sessionId}`);
}

export async function advanceAction(formData: FormData) {
  await requireRole("TECH");
  const jobId = String(formData.get("jobId"));
  const sessionId = String(formData.get("sessionId"));
  const nodeId = String(formData.get("nodeId"));
  const optionValue = String(formData.get("optionValue"));

  appendPathStep(sessionId, optionValue);
  const child = getChildNode(nodeId, optionValue);
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

  recordPhotoAnalysis(sessionId, nodeId, categoryId, confidence);
  appendPathStep(sessionId, "_continue");
  const child = getChildNode(nodeId, "_continue");
  redirect(`/tech/jobs/${jobId}/diagnose?session=${sessionId}&node=${child?.id ?? nodeId}`);
}

export async function requestSecondOpinionAction(jobId: string, sessionId: string) {
  await requireRole("TECH");
  requestSecondOpinion(sessionId);
  redirect(`/tech/jobs/${jobId}/second-opinion?session=${sessionId}`);
}

export async function resolveSecondOpinionAction(soId: string) {
  const so = getSecondOpinion(soId);
  if (so.status !== "pending") return;
  const confirmRoll = Math.random() < 0.8;
  if (confirmRoll) {
    resolveSecondOpinion(soId, "confirmed", "Reviewed field notes and photos — consistent with reported symptoms. Diagnosis confirmed, proceed with repair.");
  } else {
    const session = getSession(so.session_id);
    const secondary = JSON.parse(session.secondary_diagnoses_json || "[]");
    resolveSecondOpinion(
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

  closeJob(jobId, sessionId, user.id, actualDiagnosis, matched, partsUsed);
  redirect(`/tech?closed=${jobId}`);
}

export async function requestRestockAction(formData: FormData) {
  const user = await requireRole("TECH");
  const truckId = String(formData.get("truckId"));
  const partId = String(formData.get("partId"));
  requestRestock(truckId, partId, user.id);
  redirect(`/tech/truck?requested=${partId}`);
}

export async function cancelJobDiagnosticAction(jobId: string) {
  await requireRole("TECH");
  setJobStatus(jobId, "scheduled");
  redirect(`/tech/jobs/${jobId}`);
}

export async function createOnSiteCallAction(formData: FormData) {
  const user = await requireRole("TECH");
  const { jobId } = createIntakeJob({
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
  const session = getSession(sessionId);
  const parts = JSON.parse(session.parts_recommended_json || "[]") as { partNumber: string; name: string; qty: number }[];
  const laborHours = Math.round(((session.est_repair_time_minutes || 0) / 60) * 100) / 100;
  const laborRate = getUserHourlyRate(user.id);
  const markupPct = getCompanySettings().default_markup_pct;

  const estimateId = createEstimate({
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
  markEstimateSent(estimateId);
  redirect(`/tech/jobs/${jobId}/estimate?estimate=${estimateId}`);
}
